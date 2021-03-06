import { Backbone } from "./Backbone"
import { Attendee } from "./components/Attendee"
import { Login } from './components/Login'
import { EEventType } from "./EventType"
import { Governor } from "./Governor"
import { Home } from "./Home"
import { OPTIONS } from './OPTIONS'
import { Page } from './Page'
import { never } from "./util/never"
import { UStreamMultiplex } from "./util/StreamMultiplex"
import { Timer } from "./Timer"
import { Value } from "./Value"

async function start() {
    let { home, name } = Page.page

    let { id } = await fetch('/new/whoami').then(r => r.json())

    let { page } = Page

    let DEV = OPTIONS.dev
    if (Number.isNaN(DEV)) {
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        let devices = await navigator.mediaDevices.enumerateDevices()
        page.devices = devices
    } else {
        let devices = await navigator.mediaDevices.enumerateDevices()
        let dev_audio, dev_video

        console.log(`Using Device ${DEV}`)

        let ai = 0, vi = 0
        for (let device of devices) {
            if (device.kind === 'audioinput' && ai++ === DEV) {
                console.log(`Using Audio ${device.label}`)
                dev_audio = device.deviceId
            }
            if (device.kind === 'videoinput' && vi++ === DEV) {
                console.log(`Using Video ${device.label}`)
                dev_video = device.deviceId
            }
        }

        let stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: dev_video }, audio: { deviceId: dev_audio } })

        stream.getVideoTracks().map(t => t.applyConstraints({
            frameRate: 15,
            height: 180,
            aspectRatio: 1,
        }))

        page.outgoing_stream = stream
    }

    page.my_id = id

    Page.setBackbone(Backbone.CreateWithHome(Page.page.home.name))
    Page.render()

    let muxer = new UStreamMultiplex<Backbone.Event | Home.Events | Timer.Timers | Page.Event>()

    muxer.addStreamToMultiplex(home)
    muxer.addStreamToMultiplex(Page.listen())

    let GLOB = window as any

    GLOB.Page = Page
    GLOB.backbone = page.backbone

    let governor = new Governor(name)

    for await (let event of muxer.listen()) {
        console.log(`- ${EEventType[event.type]}`)
        switch (event.type) {
            case EEventType.BBConnectEvent: {
                page.backbone.sendRoom(Value.Home.FromId(home.name), new Backbone.HelloMessage(name))
                break
            }
            case EEventType.BackboneError: {
                let { err } = event
                console.error(err)
                break
            }
            case EEventType.BackboneClosed: {
                for (let at of home.attendees()) {
                    at.ws_status = Attendee.WsStatus.NotConnected
                }

                if (Page.page.auto_try_reconnect) {
                    governor.onBackboneDisconnect()
                }
                break
            }
            case EEventType.Backbone_IncomingMessageEvent: {
                let { from, message } = event
                console.log('  \\_', EEventType[message.type], `from ${(message as any).name || home.nameFromPeer(from)}`)
                switch (message.type) {
                    case EEventType.BBMHelloReplyMessage: {
                        let at = home.createAttendeeFromPeerReply(from, message.name)
                        at.ws_status = Attendee.WsStatus.Connected
                        if (at.auto) {
                            governor.onAttendeeHelloReply(at)
                        }
                        break
                    }
                    case EEventType.BBMHelloMessage: {
                        let at = home.createAttendeeFromPeerHello(from, message.name)
                        at.ws_status = Attendee.WsStatus.Connected
                        page.backbone.sendPeer(from, new Backbone.HelloReplyMessage(name))
                        break
                    }
                    case EEventType.BBMGoodbyeMessage: {
                        let at = home.getAttendeeFromPeerUnchecked(from)
                        if (at) {
                            at.ws_status = Attendee.WsStatus.NotConnected
                        }
                        break
                    }
                    case EEventType.BackboneSignalMessage: {
                        let { signal, connection_id } = message
                        let attendee = home.getAttendeeFromPeerUnchecked(from)
                        if (attendee && !OPTIONS.noreply) {
                            attendee.replyP2PConnection(from, connection_id, signal)
                        } else {
                            console.error(`Unknown Attendee From Peer ${from.id}`)
                        }
                        break
                    }
                    case EEventType.BackboneBumpMessage: {
                        let { } = message
                        page.home.bumpPeer(from)
                        break
                    }
                    case EEventType.BackboneMarkPeerAsSpamMessage: {
                        let { peer } = message
                        let attendee = home.getAttendeeFromPeerUnchecked(peer)
                        if (attendee) {
                            console.log({ is_spam_count: attendee.is_spam_count })
                            console.log(home.attendees_count, Math.floor(Math.sqrt(home.attendees_count + 1)))
                            if (++attendee.is_spam_count >= Math.floor(Math.sqrt(home.attendees_count + 1))) {
                                attendee.reportSpam()
                            }
                        }
                        break
                    }
                    case EEventType.BackboneForwardStreamRequestMessage: {
                        let { peer } = message
                        break
                    }
                    default: {
                        console.error(message)
                        never(message)
                    }
                }
                break
            }
            case EEventType.HomeAttendeeEvent: {
                let { event: attendee_event, peer } = event
                console.log(`  \\_ ${EEventType[attendee_event.type]}`)
                switch (attendee_event.type) {
                    case EEventType.AttendeeNewP2PConnectionEvent: {
                        let { connection_id } = attendee_event
                        console.log(`     Initiating new connection ${connection_id} to ${home.nameFromPeer(peer)}`)
                        break
                    }
                    case EEventType.AttendeeStopEvent: {
                        break
                    }
                    case EEventType.AttendeeReplyP2PConnectionEvent: {
                        let { connection_id } = attendee_event
                        console.log(`     Replying to connection ${connection_id} to ${home.nameFromPeer(peer)}`)
                        break
                    }
                    case EEventType.AttendeeIgnoreSpamEvent: {
                        console.error(`     Ignoring Spam from Peer ${home.nameFromPeer(attendee_event.peer)}`)
                        break
                    }
                    case EEventType.AttendeeMarkSpamEvent: {
                        let { peer } = attendee_event
                        console.error(`     Marking Peer as Spam ${home.nameFromPeer(attendee_event.peer)}`)
                        page.backbone.send(
                            new Backbone.HomeMessage(
                                Value.Home.FromId(home.name),
                                new Backbone.BackboneMarkPeerAsSpamMessage(peer)
                            )
                        )
                        break
                    }
                    default: {
                        console.error(attendee_event)
                        never(attendee_event)
                    }
                }
                break
            }
            case EEventType.TimerRunGC: {
                home.gc()
                break
            }
            case EEventType.PageVideoStreamAddedEvent: {
                governor.onPageVideoStreamAdded()
                break
            }
            case EEventType.VideoStreamHealthChangeEvent: {
                let { connection_id, peer } = event
                break
            }
            default: {
                console.error(event)
                never(event)
            }
        }
        Page.render()
    }
}


async function _start(maybe_name?: string) {
    let url = new URL(location.href)

    let home = url.pathname.split('/')[2]


    let {
        name = maybe_name,
        auto
    } = OPTIONS

    OPTIONS.offer_timeout = (+OPTIONS.offer_timeout) || 30

    if (name) {
        Page.Init(new Home(home), name as string, auto !== undefined)
        start()
    } else {
        Page.render(Login)
    }
}

_start()
