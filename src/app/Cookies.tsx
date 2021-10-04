export class Cookies {
    private static document: Cookies
    static getFromDocument() {
        if (this.document) {
            return this.document
        }
        else {
            return this.document = Cookies.NewFromString(document.cookie)
        }
    }
    static NewFromString(s: string) {
        let trim = (t: string) => t.trim()
        let out = new Map()
        for (let cookie of s.split(';').map(trim)) {
            let [key, val] = cookie.split('=')
            out.set(key, val)
        }
        return new Cookies(out)
    }
    constructor(public map: Map<string, string>) { }
}
