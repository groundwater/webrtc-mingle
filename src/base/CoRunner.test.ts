// import { test } from 'tap'
// import { CoRunners } from './CoRunner'
// import { Console, Logger } from './Logger'

// async function listen(c: Logger): Promise<string[]> {
//     let out: string[] = []
//     for await (let msg of c.listen()) {
//         console.log('XXX', msg)
//         out.push(msg)
//     }
//     console.log('<<<')
//     return out
// }
// test('CoRunner', async ({ test }) => {
//     test('basic', async t => {
//         let c = new Logger()
//         let out = listen(c)
//         let cr = new CoRunners(c)
//         cr.run_anonymous(async () => { })
//         cr.await
//         c.close()
//         t.deepEquals(await out, [])
//         console.log('----')
//     })
// })
