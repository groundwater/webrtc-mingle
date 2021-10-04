export async function* Range(a: number, b: number): AsyncGenerator<number> {
    for (let i = a; i < b; i++) {
        yield i
    }
}
