export function CHECK(a: any): asserts a {
    if (!a) {
        throw new Error(`CHECK FAILED`)
    }
}
