import { Attendee } from "./components/Attendee"
import { EEventType } from "./EventType"
import { UOrderedSet } from './util/OrderedSet'
import { UStreamMultiplex } from "./util/StreamMultiplex"
import { Value } from "./Value"

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
        this.muxer.addStreamToMultiplex(async function* () {
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
        this.muxer.addStreamToMultiplex(async function* () {
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
    muxer = new UStreamMultiplex<Home.Events>()
    map = new Map<string, Attendee>()
    map_sort = new UOrderedSet<string>()
    constructor(
        public name: string
    ) { }
}
export namespace Home {
    export class HomeAttendeeEvent {
        type: EEventType.HomeAttendeeEvent = EEventType.HomeAttendeeEvent
        constructor(
            public peer: Value.Peer,
            public event: Attendee.Events
        ) { }
    }
    export type Events =
        | HomeAttendeeEvent
}
