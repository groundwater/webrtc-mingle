import { parse } from "querystring"

export interface Options {
    name?: string
    auto: boolean
    dev: number
    noreply: boolean
    offer_timeout: number
}
let url = new URL(location.href)
let {
    auto,
    dev,
    noreply,
    name,
    offer_timeout,
} = parse(url.search.substr(1)) as { [name: string]: string | undefined }

function has(t?: string): t is string {
    return t !== undefined
}
export const OPTIONS: Options = {
    name,
    auto: has(auto),
    dev: has(dev) ? +dev : NaN,
    noreply: has(noreply),
    offer_timeout: has(offer_timeout) ? +offer_timeout : NaN,
}
