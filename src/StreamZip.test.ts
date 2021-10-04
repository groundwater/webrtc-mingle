import { test } from 'tap'
import { AsyncArrayFrom } from './util/AsyncArrayFrom'
import { Range } from './util/Range'

export async function* iterToAsync<T>(it: Iterable<T>) {
    for (let t of it) {
        yield t
    }
}
export async function* StreamZip<A, B>(a: AsyncIterable<A>, b: AsyncIterable<B>): AsyncGenerator<A | B> {
    let iter_a = a[Symbol.asyncIterator]()
    let iter_b = b[Symbol.asyncIterator]()
    let NOT_DONE = Symbol()
    let done_a: any = NOT_DONE
    let done_b: any = NOT_DONE
    let next_a: Promise<[0, IteratorResult<A>]> = iter_a.next().then(r => [0, r])
    let next_b: Promise<[1, IteratorResult<B>]> = iter_b.next().then(r => [1, r])
    while (done_a === NOT_DONE || done_b === NOT_DONE) {
        let next = await Promise.race([next_a, next_b])
        if (next[0] === 0) {
            let result = next[1]
            if (result.done) {
                done_a = result.value
                next_a = new Promise<never>(_ => { })
            } else {
                yield result.value
                next_a = iter_a.next().then(r => [0, r])
            }
        } else {
            let result = next[1]
            if (result.done) {
                done_b = result.value
                next_b = new Promise<never>(_ => { })
            } else {
                yield result.value
                next_b = iter_b.next().then(r => [1, r])
            }
        }
    }
    return [done_a, done_b]
}

export function wait(time_ms: number): Promise<void> {
    return new Promise(done => setTimeout(done, time_ms))
}
export async function* Spread<T>(time_ms: number, a: AsyncIterable<T>): AsyncGenerator<T> {
    let iter = a[Symbol.asyncIterator]()
    while (true) {
        let [{ value, done }] = await Promise.all<IteratorResult<T>, void>([
            iter.next(),
            wait(time_ms)
        ])
        if (done) {
            return done
        }
        yield value
    }
}

test('StreamZip', async ({ test }) => {
    test('basic', async t => {
        let out = await AsyncArrayFrom(StreamZip(Range(0, 10), Range(10, 20)))
        t.deepEquals(out, [0, 10, 1, 11, 2, 12, 3, 13, 4, 14, 5, 15, 6, 16, 7, 17, 8, 18, 9, 19])
    })
    test('mixed type', async t => {
        let out = await AsyncArrayFrom(StreamZip(Range(0, 10), iterToAsync(['a', 'b'])))
        t.deepEquals(out, [0, 'a', 1, 'b', 2, 3, 4, 5, 6, 7, 8, 9])
    })
    test('single', async t => {
        let d: any, p = new Promise(done => d = done)
        async function* gen1() {
            for (let i = 0; i < 10; i++) {
                yield i
            }
            d()
        }
        async function* gen2() {
            await p
            yield 'x'
        }
        let out = await AsyncArrayFrom(StreamZip(gen1(), gen2()))
        t.deepEquals(out, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 'x'])
    })
})
