import { test } from 'tap'
import { UAppendableStream } from './AppendableStream'
import { AsyncArrayFrom } from "./AsyncArrayFrom"
test('StreamPump', async ({ test }) => {
    test('early', async (t) => {
        let sp = new UAppendableStream<string>()
        sp.appendToStream('hello')
        sp.appendToStream('world')
        sp.closeStreamAndEndListeners()
        let out = AsyncArrayFrom(sp.listen())
        console.log(await out)
        t.deepEquals(await out, ['hello', 'world'])
    })
    test('two', async (t) => {
        let sp = new UAppendableStream<string>()
        let out = AsyncArrayFrom(sp.listen())
        sp.appendToStream('hello')
        sp.appendToStream('world')
        sp.closeStreamAndEndListeners()
        t.deepEquals(await out, ['hello', 'world'])
    })
    test('two', async (t) => {
        let sp = new UAppendableStream<string>()
        sp.appendToStream('hello')
        sp.appendToStream('world')
        sp.closeStreamAndEndListeners()
        let out = await AsyncArrayFrom(sp.listen())
        t.deepEquals(out, ['hello', 'world'])
    })
    test('empty', async (t) => {
        let sp = new UAppendableStream<string>()
        sp.closeStreamAndEndListeners()
        let out = await AsyncArrayFrom(sp.listen())
        t.deepEquals(out, [])
    })
    test('basic', async (t) => {
        let sp = new UAppendableStream<string>()
        sp.appendToStream('hello')
        sp.closeStreamAndEndListeners()
        let out = await AsyncArrayFrom(sp.listen())
        t.deepEquals(out, ['hello'])
    })
})
