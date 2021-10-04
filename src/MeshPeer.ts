import SimplePeer, { Instance as SimplePeerType } from "simple-peer"
import { EEventType } from "./EventType"
import { OPTIONS } from "./OPTIONS"
import { UAppendableStream } from "./util/AppendableStream"
import { Value } from "./Value"

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

    public pump = new UAppendableStream<MeshPeer.Message>()
    private constructor(
        public connection_id: string,
        public peer: Value.Peer,
        public simple_peer: SimplePeerType,
        public initiator: boolean,
        public offer_timeout_s: number = OPTIONS.offer_timeout,
    ) {
        simple_peer.on('connect', () => {
            this.state = MeshPeer.State.Connected
            this.pump.appendToStream(new MeshPeer.ConnectMessage())
        })
        simple_peer.on('error', err => {
            this.state = MeshPeer.State.Error
            this.pump.appendToStream(new MeshPeer.ErrorMessage(err))
        })
        simple_peer.on('end', () => {
            if (this.state !== MeshPeer.State.Error) {
                this.state = MeshPeer.State.Ended
            }
            this.pump.appendToStream(new MeshPeer.ConnectionEnded())
            this.pump.closeStreamAndEndListeners()
        })
        simple_peer.on('signal', (offer: string) => {
            if (this.state === MeshPeer.State.Ready) {
                this.state = MeshPeer.State.Offered
                if (this.offer_timeout_s > 0) {
                    setTimeout(() => {
                        if (this.state === MeshPeer.State.Offered) {
                            this.pump.appendToStream(new MeshPeer.MeshPeerTimeoutMessage(this.peer, this.connection_id))
                        }
                    }, this.offer_timeout_s * 1000)
                }
            }
            this.pump.appendToStream(new MeshPeer.SendSignalForBackbone(this.connection_id, offer))
        })
        simple_peer.on('data', (data: Uint8Array) => {
            this.pump.appendToStream(JSON.parse(data.toString()) as MeshPeer.Message)
        })
        simple_peer.on('stream', (stream: MediaStream) => {
            this.incoming_stream = stream
            this.pump.appendToStream(new MeshPeer.IncomingStream(stream))
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
            this.state = MeshPeer.State.Ended
            this.pump.appendToStream(new MeshPeer.ConnectionEnded())
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
        type: EEventType.MeshPeerTimeoutMessage = EEventType.MeshPeerTimeoutMessage
        constructor(
            public peer: Value.Peer,
            public connection_id: string,
        ) { }
    }
    export class ConnectionEnded {
        type: EEventType.MPConnectionEnded = EEventType.MPConnectionEnded
    }
    export class ConnectMessage {
        type: EEventType.MPConnectMessage = EEventType.MPConnectMessage
        constructor() { }
    }
    export class ErrorMessage {
        type: EEventType.MPErrorMessage = EEventType.MPErrorMessage
        constructor(public err: Error) { }
    }
    export class SendSignalForBackbone {
        type: EEventType.MPSignalGenerated = EEventType.MPSignalGenerated
        constructor(public connection_id: string, public signal: string) { }
    }
    export class IncomingStream {
        type: EEventType.MPIncomingStream = EEventType.MPIncomingStream
        constructor(public stream: MediaStream) { }
    }
    export class WhoHasMessage {
        type: EEventType.MPWhoHasMessage = EEventType.MPWhoHasMessage
        constructor(public peer: Value.Peer) { }
    }
    export class IHaveMessage {
        type: EEventType.MPIHaveMessage = EEventType.MPIHaveMessage
        constructor(public peer: Value.Peer) { }
    }
    export class IncomingPeerEvent {
        type: EEventType.MPIncomingPeerEvent = EEventType.MPIncomingPeerEvent
        constructor(public event: IncomingPeerEvent.Type) { }
    }
    export namespace IncomingPeerEvent {
        export type Type = void
        export function fromJSON(json: string | Uint8Array): Type {
        }
    }
    export class SimplePeerPing {
        type: EEventType.SimplePeerPing = EEventType.SimplePeerPing
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
