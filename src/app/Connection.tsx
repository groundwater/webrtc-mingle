import { v4 } from "uuid"
import SimplePeer, { Instance } from "simple-peer"
import { ConnectionOffer } from "./ConnectionOffer"
export enum ConnectionEventType {
    ConnectionReady,
    ConnectionOffered,
    ConnectionConnected,
    ConnectionEnded,
    ConnectionError,
    ConnectionData,
    ConnectionMediaStream
}
export class ConnectionReady {
    type: ConnectionEventType.ConnectionReady = ConnectionEventType.ConnectionReady;
}
export class ConnectionConnected {
    type: ConnectionEventType.ConnectionConnected = ConnectionEventType.ConnectionConnected;
}
export class ConnectionEnded {
    type: ConnectionEventType.ConnectionEnded = ConnectionEventType.ConnectionEnded;
}
export class ConnectionError {
    type: ConnectionEventType.ConnectionError = ConnectionEventType.ConnectionError;
    constructor(public error: Error) { }
}
export class ConnectionOffered {
    type: ConnectionEventType.ConnectionOffered = ConnectionEventType.ConnectionOffered;
    constructor(public offer: ConnectionOffer) { }
}
export class ConnectionData {
    type: ConnectionEventType.ConnectionData = ConnectionEventType.ConnectionData;
    constructor(public data: Uint8Array) { }
}
export class ConnectionMediaStream {
    type: ConnectionEventType.ConnectionMediaStream = ConnectionEventType.ConnectionMediaStream;
    constructor(public stream: MediaStream) { }
}
export type ConnectionMessage = ConnectionReady | ConnectionOffered | ConnectionConnected | ConnectionEnded | ConnectionError | ConnectionData | ConnectionMediaStream
export class WebRtcMessage {
    constructor(public message: string) { }
}
export enum ConnectionState {
    Ready,
    Offered,
    Connected,
    Ended,
    Error
}
export class Connection {
    addStream(stream: MediaStream) {
        this.simple_peer.addStream(stream)
    }
    public stream?: MediaStream
    public state = ConnectionState.Ready;
    public error?: Error
    private constructor(public id: string, private simple_peer: Instance, public initiiator: boolean) { }
    static CreateInitiator() {
        return this.Create({ initiator: true, id: v4() })
    }
    static Create(opts: {
        initiator: boolean
        id: string
    }) {
        let conn = new Connection(opts.id, new SimplePeer({
            initiator: opts.initiator,
            trickle: false,
        }), opts.initiator)
        conn.simple_peer.on('connect', () => {
            conn.state = ConnectionState.Connected
            conn.done(new ConnectionConnected())
        })
        conn.simple_peer.on('error', err => {
            conn.state = ConnectionState.Error
            conn.error = err
            conn.done(new ConnectionError(err))
        })
        conn.simple_peer.on('end', () => {
            conn.state = ConnectionState.Ended
            conn.done(new ConnectionEnded())
        })
        conn.simple_peer.on('signal', (offer: string) => {
            if (conn.state === ConnectionState.Ready) {
                conn.state = ConnectionState.Offered
            }
            conn.done(new ConnectionOffered(offer))
        })
        conn.simple_peer.on('data', (data: Uint8Array) => {
            conn.done(new ConnectionData(data))
        })
        conn.simple_peer.on('stream', (stream: MediaStream) => {
            conn.done(new ConnectionMediaStream(stream))
        })
        return conn
    }
    static CreateResponder(id: string) {
        let conn = this.Create({ initiator: false, id })
        return conn
    }
    private done: (s: ConnectionMessage) => any = () => { };
    async *listen(abort: Promise<never>): AsyncGenerator<ConnectionMessage> {
        while (true) {
            yield await Promise.race([
                abort,
                new Promise<ConnectionMessage>(d => this.done = d)
            ])
        }
    }
    send(m: WebRtcMessage) {
        this.simple_peer.send(JSON.stringify(m))
    }
    disconnect() {
        this.simple_peer.destroy()
    }
    receieveOffer(offer: ConnectionOffer) {
        this.simple_peer.signal(offer)
    }
}
