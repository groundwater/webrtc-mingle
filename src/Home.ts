import { Attendee } from "./Attendee"
import { EventType } from "./EventType"
import { StreamMultiplex } from "./StreamMultiplex"
import { Value } from "./Value"

export class OrderedSet<T> {
    private _list: T[] = []
    append(t: T) {
        this.remove(t)
        this._list.push(t)
    }
    prepend(t: T) {
        this._list.unshift(t)
    }
    bring_to_front(t: T) {
        this.remove(t)
        this.prepend(t)
    }
    send_to_back(t: T) {
        this.remove(t)
        this.append(t)
    }
    remove(t: T) {
        let i = this._list.indexOf(t)
        if (i === -1) {
            return
        }
        this._list = [...this._list.slice(0, i), ...this._list.slice(i + 1)]
    }
    *[Symbol.iterator]() {
        yield* this._list
    }
}

export class Home {
    clearAll() {
        for (let [key, at] of this.map.entries()) {
            at.stop()
            this.removePeer(at.peer)
        }
    }
    gc() {
        for (let at of this.map.values()) {
            at.gc()
        }
    }
    removePeer(from: Value.Peer) {
        let peer = this.map.get(from.id)
        if (peer) {
            peer.stop()
        }
        this.map.delete(from.id)
        this.map_sort.remove(from.id)
    }
    *attendees() {
        for (let id of this.map_sort) {
            yield this.map.get(id)!
        }
    }
    get attendees_count() {
        return this.map.size
    }
    bumpPeer(peer: Value.Peer) {
        this.map_sort.bring_to_front(peer.id)
    }
    getAttendeeFromPeerUnchecked(peer: Value.Peer) {
        return this.map.get(peer.id)
    }
    doIKnowPeer(peer: Value.Peer) {
        return this.map.has(peer.id)
    }
    whoHasConnectionToPeer(peer: Value.Peer) {
        for (let attendee of this.attendees()) {
            if (attendee.doIHaveConnectionWithPeer(peer)) {
                return attendee
            }
        }
        return null
    }
    createAttendeeFromPeerHello(peer: Value.Peer, name: string) {
        this.map.get(peer.id)?.stop()
        if (this.map.has(peer.id)) {
            console.log(`DELETING EXISTING PEER ${peer.id}`)
        }

        let at = Attendee.CreateWithPeer(peer, name)
        this.muxer.mux(async function* () {
            for await (let msg of at) {
                yield new Home.HomeAttendeeEvent(peer, msg)
            }
        }())
        this.map.set(peer.id, at)
        this.map_sort.append(peer.id)
        return at
    }

    createAttendeeFromPeerReply(peer: Value.Peer, name: string) {
        this.map.get(peer.id)?.stop()
        if (this.map.has(peer.id)) {
            console.log(`DELETING EXISTING PEER ${peer.id}`)
        }

        let at = Attendee.CreateInitiatorWithPeer(peer, name)
        this.muxer.mux(async function* () {
            for await (let msg of at) {
                yield new Home.HomeAttendeeEvent(peer, msg)
            }
        }())
        this.map.set(peer.id, at)
        this.map_sort.append(peer.id)
        return at
    }

    nameFromPeer(peer: Value.Peer) {
        return this.map.get(peer.id)?.name || peer.id
    }
    [Symbol.asyncIterator]() {
        return this.muxer.listen()
    }
    stop() {
        for (let attendee of this.map.values()) {
            attendee.stop()
        }
        this.muxer.stop()
    }
    muxer = new StreamMultiplex<Home.Events>()
    map = new Map<string, Attendee>()
    map_sort = new OrderedSet<string>()
    constructor(
        public name: string
    ) { }
}
export namespace Home {
    export class HomeAttendeeEvent {
        type: EventType.HomeAttendeeEvent = EventType.HomeAttendeeEvent
        constructor(
            public peer: Value.Peer,
            public event: Attendee.Events
        ) { }
    }
    export type Events =
        | HomeAttendeeEvent
}
