export function* unique<T>(tt: Iterable<T>): Iterable<T> {
    let seen = new Set<T>()
    for (let t of tt) {
        if (!seen.has(t)) {
            seen.add(t)
            yield t
        }
    }
}
export function* map<T, K>(tt: Iterable<T>, fn: (t: T) => K): Iterable<K> {
    for (let t of tt) {
        yield fn(t)
    }
}
export function wait(time_ms: number) {
    return new Promise(done => setTimeout(done, time_ms))
}
