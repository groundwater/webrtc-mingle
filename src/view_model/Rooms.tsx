import { CollectionLike } from "../base/CollectionLike"
import { Room } from './Room'
export class Rooms {
    col = new CollectionLike<Room>();
    fromJSON(pojso: any) {
        for (let roomjs of pojso) {
            this.col.set(Room.FromJSON(roomjs))
        }
    }
}
