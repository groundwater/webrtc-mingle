/**
 * I think this is an attempt at Value Types, where you compare them with .equals
 */
export namespace Value {
    export class Value {
    }
    export class Room implements Value {
        private constructor(public id: string) { }
        static FromId(id: string) {
            return new Room(id)
        }
    }
    export class Home implements Value {
        private constructor(public id: string) { }
        static FromId(id: string) {
            return new Home(id)
        }
    }
    let peers = new Map<string, Peer>()
    export class Peer implements Value {
        equals(to_peer: Peer) {
            return this.id === to_peer.id
        }
        private constructor(
            public id: string,
        ) { }
        static FromId(id: string) {
            if (!peers.has(id)) {
                peers.set(id, new Peer(id))
            }
            return peers.get(id)!
        }
    }
}
