declare module "tap" {
    export type test = (name: string, runner: TestRunner) => any
    export const test: test
    export interface Test {
        test: test
        ok<T>(tested: T, reason?: string): void
        notOk<T>(tested: T, reason?: string): void
        equals<T, K>(t: T, k: K, reason?: string): void
        deepEquals<T extends Object, K extends Object>(t: T, k: T, reason?: string): void
    }
    export type TestRunner = (t: Test) => Promise<any>
}
