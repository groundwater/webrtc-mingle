export class StreamMultiplex<T> {
    stream: AsyncIterator<T>[] = [];
    return: T[] = [];
    done = () => { };
    interrupt_cb = () => {
    }
    mux(it: AsyncIterable<T>) {
        this.stream.push(it[Symbol.asyncIterator]())
        this.done()
        this.interrupt_cb()
    }
    drain() {
        this.run = false
        this.done()
    }
    stop() {
        this.drain()
    }
    run = true;
    async *listen(): AsyncGenerator<T> {
        let stream: AsyncIterator<T>[] = []
        let next: Promise<IteratorResult<T>>[] = []
        while (this.run || stream.length > 0 || this.stream.length > 0) {
            if (stream.length === 0 && this.stream.length === 0) {
                await new Promise(done => this.done = done)
                continue
            }
            for (let i = 0; i < this.stream.length; i++) {
                stream.push(this.stream[i])
                next.push(this.stream[i].next())
            }
            this.stream = []
            let next_values = next.map((t, i) => t.then(r => [i, r]))
            next_values.push(new Promise<never>((_, fail) => {
                this.interrupt_cb = () => {
                    fail(new Error())
                }
            })
            )
            try {
                let [i, { done, value }] = await (Promise.race(next_values) as Promise<[number, IteratorResult<T>]>)
                if (done) {
                    stream = [...stream.slice(0, i), ...stream.slice(i + 1)]
                    next = [...next.slice(0, i), ...next.slice(i + 1)]
                } else {
                    next[i] = stream[i].next()
                    yield value
                }
            } catch (e) {
            }
        }
    }
    [Symbol.asyncIterator](): AsyncGenerator<T> {
        return this.listen()
    }
}
