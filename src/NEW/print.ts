export async function print(it: AsyncIterable<any>) {
    for await (let i of it) {
        console.log(i)
    }
}
