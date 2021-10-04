import { v4 } from "uuid"
import { EventType } from "../EventType"
import { MeshPeer } from "../MeshPeer"
import { OPTIONS } from "../OPTIONS"
import { StreamMultiplex } from "../StreamMultiplex"
import { StreamPump } from "../StreamPump"
import { Value } from "../Value"

export class Attendee {
    get_connection_with_video() {
        for (let conn of this.connections.values()) {
            if (conn.has_video) {
                return conn
            }
        }
    }
    reportSpam() {
        if (!this.is_spam) {
            this.pump.pump(new Attendee.AttendeeMarkSpamEvent(this.peer))
        }
        this.is_spam = true
        this.disconnect()
    }
    getFirstOpenConnection() {
        for (let conn of this.connections.values()) {
            if (conn.state === MeshPeer.State.Connected) {
                return conn.connection_id
            }
        }
    }
    hasConnection() {
        for (let conn of this.connections.values()) {
            if (conn.state === MeshPeer.State.Connected) {
                return true
            }
        }
        return false
    }
    lostPeer(peer: Value.Peer, connection_id: string) {
        let counter = this.has_peers.get(connection_id)
        if (counter) {
            counter.count--
            if (counter.count === 0) {
                this.has_peers.delete(connection_id)
            }
        }
    }
    hasPeerConnection(peer: Value.Peer, connection_id: string) {
        if (!this.has_peers.has(connection_id)) {
            this.has_peers.set(connection_id, { count: 0, peer })
        }
        this.has_peers.get(connection_id)!.count++
    }
    getConnectionByIdChecked(connection_id: string) {
        return this.connections.get(connection_id)!
    }
    doIHaveConnectionWithPeer(to_peer: Value.Peer) {
        for (let { peer } of this.has_peers.values()) {
            if (peer.equals(to_peer)) return true
        }
        return false
    }
    gc() {
        for (let [key, val] of this.connections.entries()) {
            if (
                val.state === MeshPeer.State.Ended ||
                val.state === MeshPeer.State.Error
            ) {
                this.connections.delete(key)
            }
        }
    }
    disconnect() {
        for (let conn of this.connections.values()) {
            conn.stop()
        }
    }
    stop() {
        this.pump.pump(new Attendee.AttendeeStopEvent())
        this.pump.stop()
        this.disconnect()
        this.muxer.stop()
    }
    initiateNewP2PConnection(connection_id: string = v4()) {
        if (this.is_spam) {
            throw new Error(`Spam Attendee Cannot Initiate P2P Connection`)
        }
        this.createMessagePeer(this.peer, connection_id, true)
        this.pump.pump(new Attendee.AttendeeNewP2PConnectionEvent(connection_id))
    }
    replyP2PConnection(peer: Value.Peer, connection_id: string, signal: string) {
        if (this.is_spam) {
            this.pump.pump(new Attendee.AttendeeIgnoreSpamEvent(peer, connection_id))
            return
        }
        this.pump.pump(new Attendee.AttendeeReplyP2PConnectionEvent(connection_id))
        if (!this.connections.has(connection_id)) {
            this.createMessagePeer(peer, connection_id, false)
        }
        this.connections.get(connection_id)!.signal(signal)
    }
    createMessagePeer(peer: Value.Peer, connection_id: string, init: boolean, MeshPeer_ = MeshPeer) {
        let mp = MeshPeer_.CreateForPeer(connection_id, peer, init)
        this.connections.set(connection_id, mp)
        this.connections.set(connection_id, mp)
    }
    [Symbol.asyncIterator]() {
        return this.muxer.listen()
    }
    get openConnectionCount() {
        let count = 0
        for (let c of this.connections.values()) {
            if (c.state === MeshPeer.State.Connected) {
                count++
            }
        }
        return count
    }
    get openOrOfferedConnectionCount() {
        let count = 0
        for (let c of this.connections.values()) {
            if (c.state === MeshPeer.State.Connected || c.state === MeshPeer.State.Offered) {
                count++
            }
        }
        return count
    }
    public has_peers = new Map<string, { count: number, peer: Value.Peer }>()
    public is_spam_count = 0
    public is_spam = false
    public auto = OPTIONS.auto
    private constructor(
        public peer: Value.Peer,
        public name: string,
        public initiator: boolean,
        public connections = new Map<string, MeshPeer>(),
        public pump = new StreamPump<Attendee.Events>(),
        public muxer = new StreamMultiplex<Attendee.Events>(),
        public ws_status = Attendee.WsStatus.Connected,
    ) {
        muxer.mux(pump.listen())
    }
    static CreateInitiatorWithPeer(peer: Value.Peer, name: string) {
        return new Attendee(peer, name, true)
    }
    static CreateWithPeer(peer: Value.Peer, name: string) {
        return new Attendee(peer, name, false)
    }
}
export namespace Attendee {
    export enum WsStatus {
        Connected,
        NotConnected,
    }
    export class AttendeeReplyP2PConnectionEvent {
        type: EventType.AttendeeReplyP2PConnectionEvent = EventType.AttendeeReplyP2PConnectionEvent;
        constructor(public connection_id: string) { }
    }
    export class AttendeeIgnoreSpamEvent {
        type: EventType.AttendeeIgnoreSpamEvent = EventType.AttendeeIgnoreSpamEvent
        constructor(public peer: Value.Peer, public connection_id: string) { }
    }
    export class AttendeeMarkSpamEvent {
        type: EventType.AttendeeMarkSpamEvent = EventType.AttendeeMarkSpamEvent
        constructor(public peer: Value.Peer) { }
    }
    export class AttendeeStopEvent {
        type: EventType.AttendeeStopEvent = EventType.AttendeeStopEvent;
    }
    export class AttendeeNewP2PConnectionEvent {
        type: EventType.AttendeeNewP2PConnectionEvent = EventType.AttendeeNewP2PConnectionEvent;
        constructor(public connection_id: string) { }
    }
    export type Events =
        | AttendeeIgnoreSpamEvent
        | AttendeeNewP2PConnectionEvent
        | AttendeeStopEvent
        | AttendeeReplyP2PConnectionEvent
        | AttendeeMarkSpamEvent
}