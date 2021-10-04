import { test } from 'tap'
import { StreamPump } from './StreamPump'
import { AsyncArrayFrom } from "./util/AsyncArrayFrom"
test('StreamPump', async ({ test }) => {
    test('early', async (t) => {
        let sp = new StreamPump<string>()
        sp.pump('hello')
        sp.pump('world')
        sp.stop()
        let out = AsyncArrayFrom(sp.listen())
        console.log(await out)
        t.deepEquals(await out, ['hello', 'world'])
    })
    test('two', async (t) => {
        let sp = new StreamPump<string>()
        let out = AsyncArrayFrom(sp.listen())
        sp.pump('hello')
        sp.pump('world')
        sp.stop()
        t.deepEquals(await out, ['hello', 'world'])
    })
    test('two', async (t) => {
        let sp = new StreamPump<string>()
        sp.pump('hello')
        sp.pump('world')
        sp.stop()
        let out = await AsyncArrayFrom(sp.listen())
        t.deepEquals(out, ['hello', 'world'])
    })
    test('empty', async (t) => {
        let sp = new StreamPump<string>()
        sp.stop()
        let out = await AsyncArrayFrom(sp.listen())
        t.deepEquals(out, [])
    })
    test('basic', async (t) => {
        let sp = new StreamPump<string>()
        sp.pump('hello')
        sp.stop()
        let out = await AsyncArrayFrom(sp.listen())
        t.deepEquals(out, ['hello'])
    })
})
