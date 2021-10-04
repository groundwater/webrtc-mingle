
export class UOrderedSet<T> {
    private _list: T[] = [];
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
