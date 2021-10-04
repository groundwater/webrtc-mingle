import { EventType } from "./EventType"
import { StreamPump } from "./StreamPump"
import { Value } from "./Value"
export class Backbone {
    stop() {
        this.ws.close()
    }
    public state = Backbone.State.Ready
    private pump = new StreamPump<Backbone.Event>()
    private constructor(public ws: WebSocket) {
        ws.onmessage = message => {
            this.pump.pump(Backbone.fromJSON(message.data))
        }
        ws.onopen = () => {
            this.state = Backbone.State.Connected
            this.pump.pump(new Backbone.ConnectEvent())
        }
        ws.onerror = err => {
            this.state = Backbone.State.Error
            this.pump.pump(new Backbone.BackboneError(new Error('Websocket Disconnected')))
        }
        ws.onclose = () => {
            this.state = Backbone.State.Closed
            this.pump.pump(new Backbone.BackboneClosed())
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
        console.log(`  <-- ${EventType[msg.type]}(${EventType[msg.message.type]})`)
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
        type: EventType.BBMHelloMessage = EventType.BBMHelloMessage
        constructor(
            public name: string,
        ) { }
    }
    export class HelloReplyMessage {
        type: EventType.BBMHelloReplyMessage = EventType.BBMHelloReplyMessage
        constructor(
            public name: string,
        ) { }
    }
    export class GoodbyeMessage {
        type: EventType.BBMGoodbyeMessage = EventType.BBMGoodbyeMessage
    }
    export class BackboneSignalMessage {
        type: EventType.BackboneSignalMessage = EventType.BackboneSignalMessage
        constructor(public connection_id: string, public signal: string) { }
    }
    export class IHaveConnection {
        type: EventType.IHaveConnection = EventType.IHaveConnection
        constructor(public peer: Value.Peer, public connection_id: string) { }
    }
    export class ILostConnection {
        type: EventType.ILostConnection = EventType.ILostConnection
        constructor(public peer: Value.Peer, public connection_id: string) { }
    }
    export class BackboneWhoHas {
        type: EventType.BackboneWhoHas = EventType.BackboneWhoHas
        constructor(public peer: Value.Peer) { }
    }
    export class BackboneBumpMessage {
        type: EventType.BackboneBumpMessage = EventType.BackboneBumpMessage
    }
    export class BackboneMarkPeerAsSpamMessage {
        type: EventType.BackboneMarkPeerAsSpamMessage = EventType.BackboneMarkPeerAsSpamMessage
        constructor(
            public peer: Value.Peer
        ) { }
    }
    export class BackboneForwardStreamRequestMessage {
        type: EventType.BackboneForwardStreamRequestMessage = EventType.BackboneForwardStreamRequestMessage
        constructor(
            public peer: Value.Peer
        ) { }
    }
    export class ProxySignalReadyEvent {
        type: EventType.ProxySignalReadyEvent = EventType.ProxySignalReadyEvent
        constructor(
            public signal: string
        ) { }
    }
    export class BackboneProxyRouterToProxyPeerSignalEvent {
        type: EventType.BackboneProxyRouterToProxyPeerSignalEvent = EventType.BackboneProxyRouterToProxyPeerSignalEvent
        constructor(
            public connection_id: string,
            public peer: Value.Peer,
            public signal: string,
        ) { }
    }
    export class BackboneDnstreamProxyPeerToProxyRouterSignalEvent {
        type: EventType.BackboneDownstreamProxyPeerToProxyRouterSignalEvent = EventType.BackboneDownstreamProxyPeerToProxyRouterSignalEvent
        constructor(
            public connection_id: string,
            public signal: string,
        ) { }
    }
    export class BackboneUpstreamProxyPeerToProxyRouterSignalEvent {
        type: EventType.BackboneUpstreamProxyPeerToProxyRouterSignalEvent = EventType.BackboneUpstreamProxyPeerToProxyRouterSignalEvent
        constructor(
            public connection_id: string,
            public signal: string,
        ) { }
    }
    export class BackboneCreateProxyRouterRequestEvent {
        type: EventType.BackboneCreateProxyRouterRequestEvent = EventType.BackboneCreateProxyRouterRequestEvent
        constructor(
            public upstream_connection_id: string,
            public upstream_peer: Value.Peer,
        ) { }
    }

    export class BackboneUpstreamToDownstreamRequestProxyViaRouter {
        type: EventType.BackboneUpstreamToDownstreamRequestProxyViaRouter = EventType.BackboneUpstreamToDownstreamRequestProxyViaRouter
        constructor(
            public connection_id: string,
            public router: Value.Peer,
        ) { }
    }

    export type Message =
        | BackboneBumpMessage
        | HelloMessage
        | HelloReplyMessage
        | GoodbyeMessage
        | BackboneSignalMessage
        | IHaveConnection
        | ILostConnection
        | BackboneWhoHas
        | BackboneMarkPeerAsSpamMessage
        | BackboneForwardStreamRequestMessage
        | ProxySignalReadyEvent
        | BackboneProxyRouterToProxyPeerSignalEvent
        | BackboneCreateProxyRouterRequestEvent
        | BackboneDnstreamProxyPeerToProxyRouterSignalEvent
        | BackboneUpstreamProxyPeerToProxyRouterSignalEvent
        | BackboneUpstreamToDownstreamRequestProxyViaRouter

    /**
     * Incoming Messages
     */
    export class IncomingMessageEvent {
        type: EventType.Backbone_IncomingMessageEvent = EventType.Backbone_IncomingMessageEvent
        constructor(public message: Message, public from: Value.Peer) { }
    }
    export function fromJSON(json: string): IncomingMessageEvent {
        return JSON.parse(json) as IncomingMessageEvent
    }
    /**
     * Outgoing Messages
     */
    export class RoomMessage {
        type: EventType.BBOMRoomMessage = EventType.BBOMRoomMessage
        constructor(public room: Value.Room, public message: Message) { }
    }
    export class HomeMessage {
        type: EventType.BBOMHomeMessage = EventType.BBOMHomeMessage
        constructor(public home: Value.Home, public message: Message) { }
    }
    export class PeerMessage {
        type: EventType.BBOMPeerMessage = EventType.BBOMPeerMessage
        constructor(public peer: Value.Peer, public message: Message) { }
    }
    export class BackboneError {
        type: EventType.BackboneError = EventType.BackboneError
        constructor(
            public err: Error
        ) { }
    }
    export class BackboneClosed {
        type: EventType.BackboneClosed = EventType.BackboneClosed
    }
    export type OutgoingMessage =
        | RoomMessage
        | HomeMessage
        | PeerMessage

    export class ConnectEvent {
        type: EventType.BBConnectEvent = EventType.BBConnectEvent
    }
    export type Event =
        | IncomingMessageEvent
        | ConnectEvent
        | BackboneError
        | BackboneClosed
}
