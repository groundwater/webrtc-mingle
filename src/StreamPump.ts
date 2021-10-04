export class StreamPump<T> {
    private _halt: any
    private _haltPromise = new Promise<never>((_, halt) => this._halt = halt);
    pump(t: T) {
        if (this._is_stopped) {
            throw new Error(`StreamPump stopped`)
        }
        this._next.push(t)
        this._done()
    }
    stop(e?: any) {
        if (this._is_stopped) {
            throw new Error(`Already stopped`)
        }
        this._halt(e)
        this._is_stopped = true
    }
    private _is_stopped = false
    private _next: T[] = [];
    private _done = () => { };
    async *listen(): AsyncGenerator<T> {
        try {
            let next = this._next
            this._next = []
            for (let t of next) {
                yield t
            }
            while (true) {
                await Promise.race([
                    new Promise<T>(done => this._done = done),
                    this._haltPromise,
                ])
                let next = this._next
                this._next = []
                for (let t of next) {
                    yield t
                }
            }
        }
        catch (e) {
            for (let t of this._next) {
                yield t
            }
        }
    }
}
