import { test } from 'tap'
import { asyncArrayFrom } from './asyncArrayFrom'
import { range } from "./range"
import { UStreamMultiplex } from './StreamMultiplex'
import { UAppendableStream } from './AppendableStream'

test('StreamMultiplex', async ({ test }) => {
    test('', async t => {
        let sm = new UStreamMultiplex()
        let done: any
        sm.addStreamToMultiplex(async function* () {
            yield 1
            await new Promise(d => done = d)
        }())
        for await (let j of sm) {
            if (j === 1) {
                sm.addStreamToMultiplex(async function* () {
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
        let sm = new UStreamMultiplex()
        let d: any, p = new Promise(done => d = done)
        sm.addStreamToMultiplex(async function* () {
            await p
        }())
        sm.addStreamToMultiplex(range(0, 10))
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
            let sm0 = new UStreamMultiplex()
            let sm1 = new UStreamMultiplex()
            sm0.addStreamToMultiplex(sm1.listen())
            let pump = new UAppendableStream()
            sm1.addStreamToMultiplex(pump.listen())
            pump.appendToStream(1)

            sm0.stop()
            sm1.stop()
            pump.closeStreamAndEndListeners()

            let o = asyncArrayFrom(sm0.listen())

            t.deepEquals(await o, [1])
        })
        test('pump listen stop', async t => {
            let sm0 = new UStreamMultiplex()
            let sm1 = new UStreamMultiplex()
            sm0.addStreamToMultiplex(sm1.listen())
            let pump = new UAppendableStream()
            sm1.addStreamToMultiplex(pump.listen())
            pump.appendToStream(1)

            let o = asyncArrayFrom(sm0.listen())

            sm0.stop()
            sm1.stop()
            pump.closeStreamAndEndListeners()

            t.deepEquals(await o, [1])
        })
        test('listen pump stop', async t => {
            let sm0 = new UStreamMultiplex()
            let o = asyncArrayFrom(sm0.listen())

            let sm1 = new UStreamMultiplex()
            sm0.addStreamToMultiplex(sm1.listen())
            let pump = new UAppendableStream()
            sm1.addStreamToMultiplex(pump.listen())
            pump.appendToStream(1)
            pump.appendToStream(2)


            sm0.stop()
            sm1.stop()
            pump.closeStreamAndEndListeners()

            t.deepEquals(await o, [1, 2])
        })
    })
    test('mux mux', async t => {
        let sm0 = new UStreamMultiplex()
        let sm1 = new UStreamMultiplex()
        let o = asyncArrayFrom(sm0.listen())
        sm0.addStreamToMultiplex(sm1.listen())
        sm1.addStreamToMultiplex(range(0, 10))
        sm0.drain()
        sm1.drain()
        t.deepEquals(await o, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    })
    test('mux pump', async t => {
        let sm0 = new UStreamMultiplex()
        let pump = new UAppendableStream()
        let o = asyncArrayFrom(sm0.listen())
        pump.appendToStream(0)
        pump.appendToStream(1)
        sm0.addStreamToMultiplex(pump.listen())
        pump.closeStreamAndEndListeners()
        sm0.drain()
        t.deepEquals(await o, [0, 1])
    })
    test('test', async t => {
        let sm = new UStreamMultiplex()
        let o = asyncArrayFrom(sm.listen())
        sm.addStreamToMultiplex(range(0, 10))
        sm.drain()
        t.deepEquals(await o, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    })
    test('null', async t => {
        let sm = new UStreamMultiplex()
        let o = asyncArrayFrom(sm.listen())
        sm.drain()
        t.deepEquals(await o, [])
    })
    test('1 stream', async t => {
        let sm = new UStreamMultiplex()
        let o = asyncArrayFrom(sm.listen())
        sm.addStreamToMultiplex(range(0, 1))
        sm.drain()
        t.deepEquals(await o, [0])
    })
    test('2 streams', async t => {
        let sm = new UStreamMultiplex()
        let o = asyncArrayFrom(sm.listen())
        sm.addStreamToMultiplex(range(0, 1))
        sm.addStreamToMultiplex(range(1, 2))
        sm.drain()
        t.deepEquals(await o, [0, 1])
    })
    test('3 streams', async t => {
        let sm = new UStreamMultiplex()
        let o = asyncArrayFrom(sm.listen())
        sm.addStreamToMultiplex(range(0, 10))
        sm.addStreamToMultiplex(range(10, 20))
        sm.addStreamToMultiplex(range(20, 30))
        sm.drain()
        t.equals((await o).length, 30)
    })
    test('after ', async t => {
        let sm = new UStreamMultiplex()
        sm.addStreamToMultiplex(range(0, 10))
        let o = asyncArrayFrom(sm.listen())
        sm.drain()
        t.equals((await o).length, 10)
    })
    test('before/after ', async t => {
        let sm = new UStreamMultiplex()
        sm.addStreamToMultiplex(range(0, 10))
        let o = asyncArrayFrom(sm.listen())
        sm.addStreamToMultiplex(range(0, 10))
        sm.drain()
        t.equals((await o).length, 20)
    })
})
