import expressWs from 'express-ws'
import express from 'express'
import session from 'express-session'
import { NetworkMessage as MessageToDest, Message, IncomingMessage as MessageFromSender, GoodbyeMessage, InfoMessage } from "./app/NetworkMessage"
import { stringify } from 'querystring'
import cookieParser from 'cookie-parser'
import { v4 } from 'uuid'
import { Backbone } from './NEW/Backbone'
import { EventType } from './NEW/EventType'
import { Value } from './NEW/Value'
import { MeshPeer } from './NEW/MeshPeer'
let {
    PORT = '8080'
} = process.env
let app = expressWs(express()).app
app.use(session({
    secret: 'my secret'
}))
class MessageEventListener {
    private map = new Map<string, (t: MessageFromSender) => any>()
    send(dest_id: string, from_id: string, message: Message) {
        let done = this.map.get(dest_id)
        if (done) {
            done(new MessageFromSender(from_id, message))
        }
    }
    send_all_except(ids: Iterable<string>, from_id: string, t: Message) {
        for (let id of ids) {
            if (id === from_id) continue
            this.send(id, from_id, t)
        }
    }
    async *listen(id: string): AsyncGenerator<MessageFromSender> {
        while (true) {
            yield Promise.race([
                new Promise<MessageFromSender>(done => this.map.set(id, done)),
                // abort,
            ])
        }
    }
}

class Player {
    // public image: 
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
let el = new MessageEventListener()

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
                // abort,
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
    // setTimeout(() => {
    //     console.log(`Closing WebSocket`)
    //     ws.close()
    // }, 5 * 60 * 1000)

    let { home, room } = req.params
    let { ID: id } = req.session!

    let myhome = ah.getOrCreateAllRoomById(home)
    let myroom = myhome.getOrCreateRoomById(room)

    myroom.getOrCreatePlayerById(id)

    console.log(`client connected to ${home}`)

    ws.onmessage = message => {
        let msg = JSON.parse(message.data.toString('utf-8')) as Backbone.OutgoingMessage
        // console.log(`message from ${id}`, EventType[msg.type])
        switch (msg.type) {
            case EventType.BBOMHomeMessage: {
                bbeb.send_all_except(merge<string>(myhome), id, msg.message)
                break
            }
            case EventType.BBOMPeerMessage: {
                let { peer: { id: peer_id } } = msg
                bbeb.send(peer_id, id, msg.message)
                break
            }
            case EventType.BBOMRoomMessage: {
                bbeb.send_all_except(myroom, id, msg.message)
                break
            }
            default:
                console.error(`Unexpected Message`, msg)
        }
    }
    ws.onclose = () => {
        myroom.delPlayerById(id)
        // el.send_all_except(myroom, id, new GoodbyeMessage())
        console.log(`client ${id} disconnected`)
        bbeb.send_all_except(myroom, id, new Backbone.GoodbyeMessage())
    }
    try {
        for await (let next of bbeb.listen(id)) {
            // console.log(`sending message to ${id}`)
            ws.send(JSON.stringify(next))
        }
    } catch (e) {
        console.error(`Connection Closed ${id}`)
    }
})

// app.ws('/go/:home/:room/event-stream', async (ws, req) => {
//     let { home, room } = req.params
//     let { ID: id } = req.session!

//     let myhome = ah.getOrCreateAllRoomById(home)
//     let myroom = myhome.getOrCreateRoomById(room)

//     myroom.getOrCreatePlayerById(id)

//     ws.onclose = () => {
//         myroom.delPlayerById(id)
//         el.send_all_except(myroom, id, new GoodbyeMessage())
//     }

//     ws.onmessage = message => {
//         // Messages from <ME> with a <DEST>
//         let msg = JSON.parse(message.data.toString('utf-8')) as MessageToDest

//         switch (msg.type) {
//             case 'peer': {
//                 let { dest_id } = msg
//                 console.log(`p2p from ${id} to ${dest_id}`)
//                 el.send(dest_id, id, msg.message)
//                 break
//             }
//             case 'room': {
//                 console.log(`broadcast from ${id}`)
//                 el.send_all_except(myroom, id, msg.message)
//                 break
//             }
//             case 'HomeBroadcastMessage': {
//                 for (let room of myhome) {
//                     el.send_all_except(room, id, msg.message)
//                 }
//                 break
//             }
//             case undefined: {
//                 // keepalive message
//                 break
//             }
//             default:
//                 throw new Error(`Unexpected Message ${msg}`)
//         }
//     }

//     ws.send(JSON.stringify(new MessageFromSender(id, new InfoMessage(`YourID: ${id}`))))

//     try {
//         for await (let next of el.listen(id)) {
//             ws.send(JSON.stringify(next))
//         }
//     } catch (e) {
//         console.error(`Connection Closed ${id}`)
//     }
// })
// let api = express()
// api.use(cookieParser())
// api.get('/home/:home/list-rooms', (req, res) => {
//     let { home } = req.params
//     let homeOb = ah.getOrCreateAllRoomById(home)
//     res.send(homeOb.getRoomsList())
// })
// api.post('/home/:home/:room/update-image', (req, res) => {
//     let { home, room } = req.params
//     let { id } = req.session!
//     let roomOb = ah.getOrCreateAllRoomById(home).getOrCreateRoomById(room)
//     let player = roomOb.getOrCreatePlayerById(id)
//     player.avatar_data_url = req.body.avatar_data_url
//     // console.log(`Got Player Avatar Image`, player.id)
//     res.end()
// })
app.use(express.json())
app.post('/login', (req, res) => {
    res.send()
    // let { name } = req.body
    // res.redirect(`/?name=${stringify(name)}`)
})
app.get('/', (req, res) => {
    let search = stringify(req.query)
    res.redirect(`/go/electron/lunchroom?${search}`)
})
app.get('/go/*', (req, res) => {
    // let { id } = req.cookies || {}
    // if (!id) {
    //     id = v4()
    // }
    // res.cookie('id', id)
    // res.cookie('ix', v4())
    res.sendFile('new.html', { root: __dirname + '/../static' })
})
app.use(express.static(__dirname + '/../static'))

// setup: {
//     let home = ah.getOrCreateAllRoomById('electron')
//     home.getOrCreateRoomById('Noether')
//     home.getOrCreateRoomById('Ramanujan')
//     home.getOrCreateRoomById('Feynman')
//     home.getOrCreateRoomById('Curie')
//     home.getOrCreateRoomById('Jackson')
// }

app.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`)
})
