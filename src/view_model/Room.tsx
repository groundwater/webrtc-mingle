export class Room {
    constructor(public name: string, public home: string, public label: string, public peer_ids: {
        id: string
    }[]) { }
    get id() {
        return this.name
    }
    get key() {
        return this.name
    }
    static FromJSON(ob: any) {
        return new Room(ob.name, ob.home, ob.label, ob.peers)
    }
}
