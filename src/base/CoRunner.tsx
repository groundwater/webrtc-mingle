import { Promislike } from "./Promislike"
import { INFO } from "../base/stdio"
import { Console, Logger } from "./Logger"
class CoRunner<T> {
    constructor(public result: Promise<T>, public aborts: Promislike<never>) { }
}
export class CoRunners {
    map = new Map<string, CoRunner<any>>();
    list() {
        return this.map.keys()
    }
    run<T>(id: string, co: (abort: Promise<never>) => Promise<T>) {
        console.log(`CoRunner ${id} Started`)
        if (this.map.has(id)) {
            throw new Error(`CoRunner ${id} already exists`)
        }
        let ab = new Promislike<never>()
        let cr = new CoRunner(co(ab).then(d => {
            console.log(`CoRunner ${id} Exited`)
        }).catch(d => {
            console.error(`CoRunner ${id} Failed`)
            ab.throw(d)
        }), ab)
        this.map.set(id, cr)
    }
    private next_id = 0;
    run_anonymous<T>(co: (abort: Promise<never>) => Promise<T>) {
        let id = `anonymous-${this.next_id++}`
        this.run(id, co)
    }
    stop(id: string) {
        this.map.get(id)!.aborts.throw(new Error('stop'))
    }
    await(id: string) {
        return this.map.get(id)!.result
    }
    async await_all() {
        while (Array.from(this.map.keys()).length > 0) {
            for (let cr of this.map.values()) {
                await cr.result
            }
        }
    }
}
