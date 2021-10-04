import { EEventType } from "./EventType"
import { UAppendableStream } from "./util/AppendableStream"
import { Value } from "./Value"
export class Backbone {
    stop() {
        this.ws.close()
    }
    public state = Backbone.State.Ready
    private pump = new UAppendableStream<Backbone.Event>()
    private constructor(public ws: WebSocket) {
        ws.onmessage = message => {
            this.pump.appendToStream(Backbone.fromJSON(message.data))
        }
        ws.onopen = () => {
            this.state = Backbone.State.Connected
            this.pump.appendToStream(new Backbone.ConnectEvent())
        }
        ws.onerror = err => {
            this.state = Backbone.State.Error
            this.pump.appendToStream(new Backbone.BackboneError(new Error('Websocket Disconnected')))
        }
        ws.onclose = () => {
            this.state = Backbone.State.Closed
            this.pump.appendToStream(new Backbone.BackboneClosed())
        }
    }
    static CreateWithHome(home: string) {
        let url = new URL(location.href)
        let proto = url.protocol === 'https:' ? 'wss:' : 'ws:'
        let ws = new WebSocket(`${proto}//${url.host}/new/${home}/backbone`)
        return new Backbone(ws)
    }
    sendRoom(room: Value.Room, message: Backbone.Message) {
        this.send(new Backbone.RoomMessage(room, message))
    }
    sendHome(home: Value.Home, message: Backbone.Message) {
        this.send(new Backbone.HomeMessage(home, message))
    }
    sendPeer(peer: Value.Peer, message: Backbone.Message) {
        this.send(new Backbone.PeerMessage(peer, message))
    }
    send(msg: Backbone.OutgoingMessage) {
        console.log(`  <-- ${EEventType[msg.type]}(${EEventType[msg.message.type]})`)
        this.ws.send(JSON.stringify(msg))
    }
    listen(): AsyncGenerator<Backbone.Event> {
        return this.pump.listen()
    }
}
export namespace Backbone {
    export enum State {
        Ready,
        Connected,
        Closed,
        Error,
    }
    export class HelloMessage {
        type: EEventType.BBMHelloMessage = EEventType.BBMHelloMessage
        constructor(
            public name: string,
        ) { }
    }
    export class HelloReplyMessage {
        type: EEventType.BBMHelloReplyMessage = EEventType.BBMHelloReplyMessage
        constructor(
            public name: string,
        ) { }
    }
    export class GoodbyeMessage {
        type: EEventType.BBMGoodbyeMessage = EEventType.BBMGoodbyeMessage
    }
    export class BackboneSignalMessage {
        type: EEventType.BackboneSignalMessage = EEventType.BackboneSignalMessage
        constructor(public connection_id: string, public signal: string) { }
    }
    export class BackboneBumpMessage {
        type: EEventType.BackboneBumpMessage = EEventType.BackboneBumpMessage
    }
    export class BackboneMarkPeerAsSpamMessage {
        type: EEventType.BackboneMarkPeerAsSpamMessage = EEventType.BackboneMarkPeerAsSpamMessage
        constructor(
            public peer: Value.Peer
        ) { }
    }
    export class BackboneForwardStreamRequestMessage {
        type: EEventType.BackboneForwardStreamRequestMessage = EEventType.BackboneForwardStreamRequestMessage
        constructor(
            public peer: Value.Peer
        ) { }
    }

    export type Message =
        | BackboneBumpMessage
        | HelloMessage
        | HelloReplyMessage
        | GoodbyeMessage
        | BackboneSignalMessage
        | BackboneMarkPeerAsSpamMessage
        | BackboneForwardStreamRequestMessage

    /**
     * Incoming Messages
     */
    export class IncomingMessageEvent {
        type: EEventType.Backbone_IncomingMessageEvent = EEventType.Backbone_IncomingMessageEvent
        constructor(public message: Message, public from: Value.Peer) { }
    }
    export function fromJSON(json: string): IncomingMessageEvent {
        return JSON.parse(json) as IncomingMessageEvent
    }
    /**
     * Outgoing Messages
     */
    export class RoomMessage {
        type: EEventType.BBOMRoomMessage = EEventType.BBOMRoomMessage
        constructor(public room: Value.Room, public message: Message) { }
    }
    export class HomeMessage {
        type: EEventType.BBOMHomeMessage = EEventType.BBOMHomeMessage
        constructor(public home: Value.Home, public message: Message) { }
    }
    export class PeerMessage {
        type: EEventType.BBOMPeerMessage = EEventType.BBOMPeerMessage
        constructor(public peer: Value.Peer, public message: Message) { }
    }
    export class BackboneError {
        type: EEventType.BackboneError = EEventType.BackboneError
        constructor(
            public err: Error
        ) { }
    }
    export class BackboneClosed {
        type: EEventType.BackboneClosed = EEventType.BackboneClosed
    }
    export type OutgoingMessage =
        | RoomMessage
        | HomeMessage
        | PeerMessage

    export class ConnectEvent {
        type: EEventType.BBConnectEvent = EEventType.BBConnectEvent
    }
    export type Event =
        | IncomingMessageEvent
        | ConnectEvent
        | BackboneError
        | BackboneClosed
}
