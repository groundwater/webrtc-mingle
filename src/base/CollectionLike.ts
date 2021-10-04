export class Maybe<T> {
    constructor(
        private maybe?: T
    ) { }
    checked() {
        if (this.maybe) {
            return this.maybe
        } else {
            throw new Error(`Is Empty`)
        }
    }
    unchecked() {
        return this.maybe
    }
}

export class CollectionLike<T extends { id: string }> {
    constructor(...ts: T[]) {
        for (let t of ts) {
            this.set(t)
        }
    }
    private map = new Map<string, T>()
    hasById(id: string) {
        return this.map.has(id)
    }
    getCheckedById(id: string): T {
        let t = this.map.get(id)
        if (t) {
            return t
        } else {
            throw new Error(`No entry for id ${id}`)
        }
    }
    getMaybeById(id: string): Maybe<T> {
        return new Maybe(this.map.get(id))
    }
    getUncheckedById(id: string): T | undefined {
        return this.map.get(id)
    }
    set(t: T) {
        this.map.set(t.id, t)
        return t
    }
    deleteById(id: string) {
        this.map.delete(id)
    }
    getOrCreateById(id: string, factory: (id: string) => T): T {
        if (!this.map.has(id)) {
            this.map.set(id, factory(id))
        }

        return this.map.get(id)!
    }
    *[Symbol.iterator]() {
        yield* this.map.values()
    }
}
