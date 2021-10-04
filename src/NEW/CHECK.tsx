export function CHECK<T>(t: T): asserts t {
    if (!t) {
        throw new Error(`CHECK Error`)
    }
}
