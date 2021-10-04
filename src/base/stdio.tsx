let stack: Object[] = []

export function ENTER<V extends Object>(ob: V) {
    stack.push(ob)
}
export function EXIT<V extends Object>(ob: V) {
    let stack_key = stack.pop()
    if (stack_key !== ob) {
        console.error(stack)
        console.error(stack_key)
        console.error(ob)
        throw new Error(`Unexpected Exit`)
    }
}
export function INFO(categories: string[], ...any: any[]) {
    console.log(`[${categories.join('][')}]`, any)
}
export function VARS(categories: string[], ...any: any[]) {
    console.log(`[${categories.join('][')}]`, any)
}
export function ERROR(msg: string, ...any: any[]) {
    if (any.length > 0) {
        console.error(...any)
    }
    console.error(new Error(msg))
}
