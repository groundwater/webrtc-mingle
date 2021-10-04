export async function asyncArrayFrom<T>(a: AsyncIterable<T>) {
    let out: T[] = []
    for await (let t of a) {
        out.push(t)
    }
    return out
}
