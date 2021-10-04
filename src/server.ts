import express from 'express'
import session from 'express-session'
import expressWs from 'express-ws'
import { stringify } from 'querystring'
import { v4 } from 'uuid'
import { Backbone } from './Backbone'
import { EEventType } from './EventType'
import { Value } from './Value'

let {
    PORT = '8080'
} = process.env

let app = expressWs(express()).app

app.use(session({
    secret: 'my secret'
}))

class Player {
    constructor(
        public id: string
    ) { }
    avatar_data_url?: string
    toJSON() {
        return {
            id: this.id,
            avatar_data_url: this.avatar_data_url,
        }
    }
}
class Room {
    private map = new Map<string, Player>()
    delPlayerById(id: string) {
        this.map.delete(id)
    }
    getOrCreatePlayerById(id: string) {
        if (!this.map.has(id)) {
            this.map.set(id, new Player(id))
        }
        return this.map.get(id)!
    }
    *[Symbol.iterator]() {
        yield* this.map.keys()
    }
    constructor(
        public home: string,
        public name: string,
    ) { }
    toJSON() {
        let { home, name } = this
        let peers = Array.from(this.map.values())
        return {
            home,
            name,
            peers,
        }
    }
}
class Home {
    private map = new Map<string, Room>()
    getOrCreateRoomById(id: string) {
        if (!this.map.has(id)) {
            this.map.set(id, new Room(this.id, id))
        }
        return this.map.get(id)!
    }
    getRoomsList() {
        return Array.from(this.map.values())
    }
    [Symbol.iterator]() {
        return this.map.values()
    }
    constructor(
        public id: string
    ) { }
}
class AllHomes {
    private map = new Map<string, Home>()
    getOrCreateAllRoomById(id: string) {
        if (!this.map.has(id)) {
            this.map.set(id, new Home(id))
        }
        return this.map.get(id)!
    }
}
let ah = new AllHomes()

class BackboneEventBus {
    private map = new Map<string, (t: Backbone.IncomingMessageEvent) => any>()
    send(dest_id: string, from_id: string, message: Backbone.Message) {
        let done = this.map.get(dest_id)
        if (done) {
            done(new Backbone.IncomingMessageEvent(message, Value.Peer.FromId(from_id)))
        }
    }
    send_all_except(ids: Iterable<string>, from_id: string, t: Backbone.Message) {
        for (let id of ids) {
            if (id === from_id) continue
            this.send(id, from_id, t)
        }
    }
    async *listen(id: string): AsyncGenerator<Backbone.IncomingMessageEvent> {
        while (true) {
            yield Promise.race([
                new Promise<Backbone.IncomingMessageEvent>(done => this.map.set(id, done)),
            ])
        }
    }
}

let bbeb = new BackboneEventBus()

function* merge<T>(it: Iterable<Iterable<T>>): Generator<T> {
    for (let i of it) {
        for (let j of i) {
            yield j
        }
    }
}
app.use((req, res, next) => {
    if (!req.session!.ID) {
        let ID = v4()
        req.session!.ID = ID
        req.session!.save(next)
    } else {
        next()
    }
})
app.get('/new/whoami', async (req, res) => {
    let { ID } = req.session!
    res.send({ id: ID })
})
app.ws('/new/:home/backbone', async (ws, req) => {
    let { home, room } = req.params
    let { ID: id } = req.session!

    let myhome = ah.getOrCreateAllRoomById(home)
    let myroom = myhome.getOrCreateRoomById(room)

    myroom.getOrCreatePlayerById(id)

    console.log(`client connected to ${home}`)

    ws.onmessage = message => {
        let msg = JSON.parse(message.data.toString('utf-8')) as Backbone.OutgoingMessage
        switch (msg.type) {
            case EEventType.BBOMHomeMessage: {
                bbeb.send_all_except(merge<string>(myhome), id, msg.message)
                break
            }
            case EEventType.BBOMPeerMessage: {
                let { peer: { id: peer_id } } = msg
                bbeb.send(peer_id, id, msg.message)
                break
            }
            case EEventType.BBOMRoomMessage: {
                bbeb.send_all_except(myroom, id, msg.message)
                break
            }
            default:
                console.error(`Unexpected Message`, msg)
        }
    }
    ws.onclose = () => {
        myroom.delPlayerById(id)
        console.log(`client ${id} disconnected`)
        bbeb.send_all_except(myroom, id, new Backbone.GoodbyeMessage())
    }
    try {
        for await (let next of bbeb.listen(id)) {
            ws.send(JSON.stringify(next))
        }
    } catch (e) {
        console.error(`Connection Closed ${id}`)
    }
})


app.use(express.json())
app.post('/login', (req, res) => {
    res.send()
})
app.get('/', (req, res) => {
    let search = stringify(req.query)
    res.redirect(`/go/electron/lunchroom?${search}`)
})
app.get('/go/*', (req, res) => {
    res.sendFile('new.html', { root: __dirname + '/../static' })
})
app.use(express.static(__dirname + '/../static'))

app.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`)
})
