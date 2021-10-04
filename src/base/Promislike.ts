export class Promislike<T> implements Promise<T> {
    private done: any
    private fail: any
    private maybe_result?: T
    private maybe_error?: Error
    private prom = new Promise<T>((d, f) => { this.done = d; this.fail = f });
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null | undefined, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined): Promise<TResult1 | TResult2> {
        return this.prom.then(onfulfilled)
    }
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null | undefined): Promise<T | TResult> {
        return this.prom.then(onrejected)
    }
    [Symbol.toStringTag]: string = '';
    finally(onfinally?: (() => void) | null | undefined): Promise<T> {
        return this.prom.finally(onfinally)
    }
    resolve(t: T) {
        this.maybe_result = t
        this.done(t)
    }
    now() {
        if (this.maybe_result) {
            return this.maybe_result
        } else if (this.maybe_error) {
            throw this.maybe_error
        } else {
            throw new Error(`Result not ready`)
        }
    }
    now_unchecked() {
        if (this.maybe_error) {
            throw this.maybe_error
        } else {
            return this.maybe_result
        }
    }
    throw(err: Error) {
        this.maybe_error = err
        this.fail(err)
    }
}
