import SimplePeer, { Instance as SimplePeerType } from "simple-peer"
import { StreamPump } from "./StreamPump"
import { EventType } from "./EventType"
import { Value } from "./Value"
import { OPTIONS } from "./OPTIONS"

export enum MeshPeerStreamHealth {
    Unknown,
    Best,
    Good,
    Okay,
    Worse,
    Failed,
}

export class MeshPeer {
    public incoming_stream?: MediaStream
    public state = MeshPeer.State.Ready
    public pings = 0
    public outgoing_stream?: MediaStream
    public outgoing_stream_video_enabled = true
    public outgoing_stream_audio_enabled = true

    public stream_health: MeshPeerStreamHealth = MeshPeerStreamHealth.Unknown

    public pump = new StreamPump<MeshPeer.Message>()
    private constructor(
        public connection_id: string,
        public peer: Value.Peer,
        public simple_peer: SimplePeerType,
        public initiator: boolean,
        public offer_timeout_s: number = OPTIONS.offer_timeout,
    ) {
        simple_peer.on('connect', () => {
            this.state = MeshPeer.State.Connected
            this.pump.pump(new MeshPeer.ConnectMessage())
        })
        simple_peer.on('error', err => {
            this.state = MeshPeer.State.Error
            this.pump.pump(new MeshPeer.ErrorMessage(err))
        })
        simple_peer.on('end', () => {
            if (this.state !== MeshPeer.State.Error) {
                this.state = MeshPeer.State.Ended
            }
            this.pump.pump(new MeshPeer.ConnectionEnded())
            this.pump.stop()
        })
        simple_peer.on('signal', (offer: string) => {
            if (this.state === MeshPeer.State.Ready) {
                this.state = MeshPeer.State.Offered
                if (this.offer_timeout_s > 0) {
                    setTimeout(() => {
                        // We haven't connected yet
                        if (this.state === MeshPeer.State.Offered) {
                            this.pump.pump(new MeshPeer.MeshPeerTimeoutMessage(this.peer, this.connection_id))
                        }
                    }, this.offer_timeout_s * 1000)
                }
            }
            this.pump.pump(new MeshPeer.SendSignalForBackbone(this.connection_id, offer))
        })
        simple_peer.on('data', (data: Uint8Array) => {
            this.pump.pump(JSON.parse(data.toString()) as MeshPeer.Message)
        })
        simple_peer.on('stream', (stream: MediaStream) => {
            this.incoming_stream = stream
            this.pump.pump(new MeshPeer.IncomingStream(stream))
        })
    }
    static CreateForPeer(connection_id: string, peer: Value.Peer, initiator: boolean) {
        let simple_peer = new SimplePeer({ initiator, trickle: false })
        let mp = new MeshPeer(connection_id, peer, simple_peer, initiator)
        return mp
    }
    enableAudio(enabled: boolean) {
        if (this.outgoing_stream) {
            for (let audio of this.outgoing_stream.getAudioTracks()) {
                audio.enabled = this.outgoing_stream_audio_enabled = enabled
            }
        }
    }
    enableVideo(enabled: boolean) {
        if (this.outgoing_stream) {
            for (let video of this.outgoing_stream.getVideoTracks()) {
                video.enabled = this.outgoing_stream_video_enabled = enabled
            }
        }
    }
    get has_video() {
        return !!this.incoming_stream
    }
    stop() {
        if (this.state === MeshPeer.State.Connected) {
            this.simple_peer.end()
        } else if (this.state === MeshPeer.State.Ready || this.state === MeshPeer.State.Offered) {
            // If we're not already connected, simple peer will not emit an end event.
            // We simulate an ending anyways so folks can respond to the peer closing.
            this.state = MeshPeer.State.Ended
            this.pump.pump(new MeshPeer.ConnectionEnded())
        }
    }
    signal(signal: string) {
        this.simple_peer.signal(signal)
    }
    send(message: MeshPeer.Message) {
        if (this.state !== MeshPeer.State.Connected) {
            throw new Error(`Peer not connected`)
        }
        this.simple_peer.send(JSON.stringify(message))
    }
    listen(): AsyncGenerator<MeshPeer.Message> {
        return this.pump.listen()
    }
    addStream(stream: MediaStream) {
        if (!this.outgoing_stream) {
            this.simple_peer.addStream(stream)
            this.outgoing_stream = stream
        }
    }
}
export namespace MeshPeer {
    export enum State {
        Ready,
        Connected,
        Offered,
        Error,
        Ended
    }
    export class MeshPeerTimeoutMessage {
        type: EventType.MeshPeerTimeoutMessage = EventType.MeshPeerTimeoutMessage
        constructor(
            public peer: Value.Peer,
            public connection_id: string,
        ) { }
    }
    export class ConnectionEnded {
        type: EventType.MPConnectionEnded = EventType.MPConnectionEnded
    }
    export class ConnectMessage {
        type: EventType.MPConnectMessage = EventType.MPConnectMessage
        constructor() { }
    }
    export class ErrorMessage {
        type: EventType.MPErrorMessage = EventType.MPErrorMessage
        constructor(public err: Error) { }
    }
    export class SendSignalForBackbone {
        type: EventType.MPSignalGenerated = EventType.MPSignalGenerated
        constructor(public connection_id: string, public signal: string) { }
    }
    export class IncomingStream {
        type: EventType.MPIncomingStream = EventType.MPIncomingStream
        constructor(public stream: MediaStream) { }
    }
    export class WhoHasMessage {
        type: EventType.MPWhoHasMessage = EventType.MPWhoHasMessage
        constructor(public peer: Value.Peer) { }
    }
    export class IHaveMessage {
        type: EventType.MPIHaveMessage = EventType.MPIHaveMessage
        constructor(public peer: Value.Peer) { }
    }
    export class IncomingPeerEvent {
        type: EventType.MPIncomingPeerEvent = EventType.MPIncomingPeerEvent
        constructor(public event: IncomingPeerEvent.Type) { }
    }
    export namespace IncomingPeerEvent {
        export type Type = void
        export function fromJSON(json: string | Uint8Array): Type {
        }
    }
    export class SimplePeerPing {
        type: EventType.SimplePeerPing = EventType.SimplePeerPing
    }
    export type Message =
        | ConnectionEnded
        | ConnectMessage
        | ErrorMessage
        | IHaveMessage
        | IncomingPeerEvent
        | IncomingStream
        | MeshPeerTimeoutMessage
        | SendSignalForBackbone
        | SimplePeerPing
        | WhoHasMessage
}
