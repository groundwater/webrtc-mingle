import { test } from 'tap'
import { AsyncArrayFrom } from './util/AsyncArrayFrom'
import { Range } from "./util/Range"
import { StreamMultiplex } from './StreamMultiplex'
import { StreamPump } from './StreamPump'

test('StreamMultiplex', async ({ test }) => {
    test('', async t => {
        let sm = new StreamMultiplex()
        let done: any
        sm.mux(async function* () {
            yield 1
            await new Promise(d => done = d)
        }())
        for await (let j of sm) {
            if (j === 1) {
                sm.mux(async function* () {
                    yield 2
                }())
            }
            if (j === 2) {
                done()
                sm.stop()
            }
        }
    })
    test('', async t => {
        let sm = new StreamMultiplex()
        let d: any, p = new Promise(done => d = () => {
            done()
        })
        sm.mux(async function* () {
            await p
        }())
        sm.mux(Range(0, 10))
        let i = 0
        sm.stop()
        for await (let j of sm) {
            t.equals(j, i++, `${j}`)
            if (j === 9) {
                d()
            }
        }
    })
    test('mux mux pump', async ({ test }) => {
        test('pump stop listen', async t => {
            let sm0 = new StreamMultiplex()
            let sm1 = new StreamMultiplex()
            sm0.mux(sm1.listen())
            let pump = new StreamPump()
            sm1.mux(pump.listen())
            pump.pump(1)

            sm0.stop()
            sm1.stop()
            pump.stop()

            let o = AsyncArrayFrom(sm0.listen())

            t.deepEquals(await o, [1])
        })
        test('pump listen stop', async t => {
            let sm0 = new StreamMultiplex()
            let sm1 = new StreamMultiplex()
            sm0.mux(sm1.listen())
            let pump = new StreamPump()
            sm1.mux(pump.listen())
            pump.pump(1)

            let o = AsyncArrayFrom(sm0.listen())

            sm0.stop()
            sm1.stop()
            pump.stop()

            t.deepEquals(await o, [1])
        })
        test('listen pump stop', async t => {
            let sm0 = new StreamMultiplex()
            let o = AsyncArrayFrom(sm0.listen())

            let sm1 = new StreamMultiplex()
            sm0.mux(sm1.listen())
            let pump = new StreamPump()
            sm1.mux(pump.listen())
            pump.pump(1)
            pump.pump(2)


            sm0.stop()
            sm1.stop()
            pump.stop()

            t.deepEquals(await o, [1, 2])
        })
    })
    test('mux mux', async t => {
        let sm0 = new StreamMultiplex()
        let sm1 = new StreamMultiplex()
        let o = AsyncArrayFrom(sm0.listen())
        sm0.mux(sm1.listen())
        sm1.mux(Range(0, 10))
        sm0.drain()
        sm1.drain()
        t.deepEquals(await o, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    })
    test('mux pump', async t => {
        let sm0 = new StreamMultiplex()
        let pump = new StreamPump()
        let o = AsyncArrayFrom(sm0.listen())
        pump.pump(0)
        pump.pump(1)
        sm0.mux(pump.listen())
        pump.stop()
        sm0.drain()
        t.deepEquals(await o, [0, 1])
    })
    test('test', async t => {
        let sm = new StreamMultiplex()
        let o = AsyncArrayFrom(sm.listen())
        sm.mux(Range(0, 10))
        sm.drain()
        t.deepEquals(await o, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    })
    test('null', async t => {
        let sm = new StreamMultiplex()
        let o = AsyncArrayFrom(sm.listen())
        sm.drain()
        t.deepEquals(await o, [])
    })
    test('1 stream', async t => {
        let sm = new StreamMultiplex()
        let o = AsyncArrayFrom(sm.listen())
        sm.mux(Range(0, 1))
        sm.drain()
        t.deepEquals(await o, [0])
    })
    test('2 streams', async t => {
        let sm = new StreamMultiplex()
        let o = AsyncArrayFrom(sm.listen())
        sm.mux(Range(0, 1))
        sm.mux(Range(1, 2))
        sm.drain()
        t.deepEquals(await o, [0, 1])
    })
    test('3 streams', async t => {
        let sm = new StreamMultiplex()
        let o = AsyncArrayFrom(sm.listen())
        sm.mux(Range(0, 10))
        sm.mux(Range(10, 20))
        sm.mux(Range(20, 30))
        sm.drain()
        t.equals((await o).length, 30)
    })
    test('after ', async t => {
        let sm = new StreamMultiplex()
        sm.mux(Range(0, 10))
        let o = AsyncArrayFrom(sm.listen())
        sm.drain()
        t.equals((await o).length, 10)
    })
    test('before/after ', async t => {
        let sm = new StreamMultiplex()
        sm.mux(Range(0, 10))
        let o = AsyncArrayFrom(sm.listen())
        sm.mux(Range(0, 10))
        sm.drain()
        t.equals((await o).length, 20)
    })
})
