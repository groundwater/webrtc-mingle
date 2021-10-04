export async function* abortable<T>(abort: Promise<never>, aii: AsyncIterable<T>): AsyncGenerator<T> {
    let iter = aii[Symbol.asyncIterator]()
    while (true) {
        let { done, value } = await Promise.race([
            iter.next(),
            abort,
        ])
        if (done) {
            return value
        }
        else {
            yield value
        }
    }
}
