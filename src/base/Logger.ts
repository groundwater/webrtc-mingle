import { Promislike } from './Promislike'
export type LoggerMessage = string
export class Logger {
    write(s: LoggerMessage) {
        this.next(s)
    }
    log(s: LoggerMessage) {
        this.write(s)
    }
    close() {
        this.stop.throw(new Error('stop'))
    }
    private next = (v: LoggerMessage) => { }
    private stop = new Promislike<never>()
    async *listen(): AsyncGenerator<LoggerMessage> {
        try {
            while (true) {
                let z = await Promise.race([
                    this.stop,
                    new Promise<LoggerMessage>(done => {
                        this.next = done
                    })
                ])
                console.log('KKKK', z)
                yield z
            }
        } catch (e) {
            // return ok!
            console.log('STOP', e)
        }
    }
}
export const Console = new Logger()
