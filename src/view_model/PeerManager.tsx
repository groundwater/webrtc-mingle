import { CollectionLike } from "../base/CollectionLike"
import { Peer, PeerID } from './Peer'
export class PeerManager {
    resetAll() {
        for (let peer of this.map) {
            peer.clearAllConnections()
        }
        this.map = new CollectionLike()
    }
    removeById(from_id: string) {
        this.map.deleteById(from_id)
    }
    hasPeerWithId(id: string) {
        return this.map.hasById(id)
    }
    private map = new CollectionLike<Peer>();
    getOrCreatePeerByIdWithOutStream(peer_id: PeerID, stream: MediaStream) {
        if (!this.map.hasById(peer_id)) {
            this.map.set(Peer.CreateWithIdAndOutgoingStream(peer_id, stream))
        }
        return this.map.getCheckedById(peer_id)
    }
    getUncheckedPeerById(id: string) {
        return this.map.getUncheckedById(id)
    }
    *[Symbol.iterator]() {
        yield* this.map
    }
}
