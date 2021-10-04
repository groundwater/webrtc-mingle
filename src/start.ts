import { Backbone } from "./Backbone"
import { Attendee } from "./components/Attendee"
import { Login } from './components/Login'
import { EventType } from "./EventType"
import { Governor } from "./Governor"
import { Home } from "./Home"
import { MeshPeerStreamHealth } from "./MeshPeer"
import { OPTIONS } from './OPTIONS'
import { Page } from './Page'
import { StreamMultiplex } from "./StreamMultiplex"
import { never } from "./util/never"
import { Timer } from "./util/Timer"
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

        // Typescript is giving me an error here, maybe the API has changed
        // stream.getAudioTracks().map(t => t.applyConstraints({
        //     noiseSuppression: true,
        // }))

        page.outgoing_stream = stream
    }

    page.my_id = id

    Page.setBackbone(Backbone.CreateWithHome(Page.page.home.name))
    Page.render()

    let muxer = new StreamMultiplex<Backbone.Event | Home.Events | Timer.Timers | Page.Event /*| ProxyPeer.Event | ProxyRouter.Event | ProxyRouter.Event*/>()

    muxer.mux(home)
    muxer.mux(Page.listen())

    let GLOB = window as any

    GLOB.Page = Page
    GLOB.backbone = page.backbone

    let governor = new Governor(name)

    for await (let event of muxer.listen()) {
        console.log(`- ${EventType[event.type]}`)
        switch (event.type) {
            case EventType.BBConnectEvent: {
                page.backbone.sendRoom(Value.Home.FromId(home.name), new Backbone.HelloMessage(name))
                break
            }
            case EventType.BackboneError: {
                let { err } = event
                console.error(err)
                break
            }
            case EventType.BackboneClosed: {
                for (let at of home.attendees()) {
                    at.ws_status = Attendee.WsStatus.NotConnected
                }

                if (Page.page.auto_try_reconnect) {
                    governor.onBackboneDisconnect()
                }
                break
            }
            case EventType.Backbone_IncomingMessageEvent: {
                let { from, message } = event
                console.log('  \\_', EventType[message.type], `from ${(message as any).name || home.nameFromPeer(from)}`)
                switch (message.type) {
                    case EventType.BBMHelloReplyMessage: {
                        let at = home.createAttendeeFromPeerReply(from, message.name)
                        at.ws_status = Attendee.WsStatus.Connected
                        if (at.auto) {
                            governor.onAttendeeHelloReply(at)
                        }
                        // page.backbone.send(
                        //     new Backbone.HomeMessage(Value.Home.FromId(home.name), new Backbone.BackboneWhoHas(from))
                        // )
                        break
                    }
                    case EventType.BBMHelloMessage: {
                        let at = home.createAttendeeFromPeerHello(from, message.name)
                        at.ws_status = Attendee.WsStatus.Connected
                        page.backbone.sendPeer(from, new Backbone.HelloReplyMessage(name))
                        break
                    }
                    case EventType.BBMGoodbyeMessage: {
                        let at = home.getAttendeeFromPeerUnchecked(from)
                        if (at) {
                            at.ws_status = Attendee.WsStatus.NotConnected
                        }
                        break
                    }
                    case EventType.BackboneSignalMessage: {
                        let { signal, connection_id } = message
                        let attendee = home.getAttendeeFromPeerUnchecked(from)
                        if (attendee && !OPTIONS.noreply) {
                            attendee.replyP2PConnection(from, connection_id, signal)
                        } else {
                            console.error(`Unknown Attendee From Peer ${from.id}`)
                        }
                        break
                    }
                    // case EventType.IHaveConnection: {
                    //     let { peer, connection_id } = message
                    //     let attendee = home.getAttendeeFromPeerUnchecked(from)
                    //     CHECK(attendee)
                    //     attendee.hasPeerConnection(peer, connection_id)
                    //     if (Page.page.auto) {
                    //         governor.onProxyHasPeer(attendee, peer)
                    //     }
                    //     break
                    // }
                    // case EventType.ILostConnection: {
                    //     let { peer, connection_id } = message
                    //     let attendee = home.getAttendeeFromPeerUnchecked(from)
                    //     if (attendee) {
                    //         attendee.lostPeer(peer, connection_id)
                    //     }
                    //     break
                    // }
                    // case EventType.BackboneWhoHas: {
                    //     let { peer } = message
                    //     let attendee = home.getAttendeeFromPeerUnchecked(peer)
                    //     if (attendee) {
                    //         let connection_id = attendee.getFirstOpenConnection()
                    //         if (connection_id) {
                    //             page.backbone.send(
                    //                 new Backbone.PeerMessage(from, new Backbone.IHaveConnection(peer, connection_id))
                    //             )
                    //         }
                    //     }
                    //     break
                    // }
                    case EventType.BackboneBumpMessage: {
                        let { } = message
                        page.home.bumpPeer(from)
                        break
                    }
                    case EventType.BackboneMarkPeerAsSpamMessage: {
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
                    case EventType.BackboneForwardStreamRequestMessage: {
                        let { peer } = message
                        break
                    }
                    // case EventType.BackboneDownstreamProxyPeerToProxyRouterSignalEvent: {
                    //     let { signal, connection_id } = message
                    //     let router = page.proxy_routers.getRouterByConnectionUnchecked(connection_id)
                    //     CHECK(router)
                    //     CHECK(router.downstream)
                    //     router.downstream.signal(signal)
                    //     break
                    // }
                    // case EventType.BackboneUpstreamProxyPeerToProxyRouterSignalEvent: {
                    //     let { signal, connection_id } = message
                    //     let router = page.proxy_routers.getRouterByConnectionUnchecked(connection_id)
                    //     CHECK(router)
                    //     router.upstream.signal(signal)
                    //     break
                    // }
                    // case EventType.ProxySignalReadyEvent: {
                    //     break
                    // }
                    // case EventType.BackboneProxyRouterToProxyPeerSignalEvent: {
                    //     let { connection_id, signal, peer } = message
                    //     let proxy = page.proxy_peers.getBy(connection_id)
                    //     CHECK(proxy)
                    //     proxy.router_peer.signal(signal)
                    //     break
                    // }
                    // case EventType.BackboneCreateProxyRouterRequestEvent: {
                    //     let { upstream_peer, upstream_connection_id } = message
                    //     console.log(`     - from:`, home.nameFromPeer(from))
                    //     console.log(`     - upstream_peer:`, home.nameFromPeer(upstream_peer))
                    //     console.log(`     - upstream_connection_id:`, upstream_connection_id)
                    //     let router = page.proxy_routers.createWith(upstream_connection_id, upstream_peer, from)
                    //     break
                    // }
                    // case EventType.BackboneUpstreamToDownstreamRequestProxyViaRouter: {
                    //     let { connection_id, router } = message
                    //     page.proxy_peers.create(true, connection_id, router, from)
                    //     page.backbone.send(
                    //         new Backbone.PeerMessage(
                    //             router,
                    //             new Backbone.BackboneCreateProxyRouterRequestEvent(connection_id, from)
                    //         )
                    //     )
                    //     break
                    // }
                    default: {
                        console.error(message)
                        never(message)
                    }
                }
                break
            }
            case EventType.HomeAttendeeEvent: {
                let { event: attendee_event, peer } = event
                console.log(`  \\_ ${EventType[attendee_event.type]}`)
                switch (attendee_event.type) {
                    // case EventType.AttendeeMeshPeerEvent: {
                    //     let { event: meshpeer_event, connection_id } = attendee_event
                    //     console.log(`    \\_ ${EventType[meshpeer_event.type]} from ${home.nameFromPeer(peer)}`)
                    //     switch (meshpeer_event.type) {
                    //         case EventType.MPConnectMessage: {
                    //             page.backbone.send(
                    //                 new Backbone.HomeMessage(
                    //                     Value.Home.FromId(home.name),
                    //                     new Backbone.IHaveConnection(peer, connection_id)
                    //                 )
                    //             )
                    //             if (page.auto_video_stream) {
                    //                 let conn = home.getAttendeeFromPeerUnchecked(peer)?.getConnectionByIdChecked(connection_id)
                    //                 if (conn) {
                    //                     governor.onP2PConnect(conn)
                    //                 }
                    //             }
                    //             break
                    //         }
                    //         case EventType.MPConnectionEnded: {
                    //             page.backbone.send(
                    //                 new Backbone.HomeMessage(
                    //                     Value.Home.FromId(home.name),
                    //                     new Backbone.ILostConnection(peer, connection_id)
                    //                 )
                    //             )
                    //             let attendee = home.getAttendeeFromPeerUnchecked(peer)
                    //             CHECK(attendee)
                    //             if (attendee.auto) {
                    //                 let conn = home.getAttendeeFromPeerUnchecked(peer)?.getConnectionByIdChecked(connection_id)
                    //                 if (conn) {
                    //                     governor.onP2PDisconnect(attendee, conn)
                    //                 }
                    //             }
                    //             break
                    //         }
                    //         case EventType.MPErrorMessage: {
                    //             let { err } = meshpeer_event
                    //             console.error(`       *`, err)
                    //             let attendee = home.getAttendeeFromPeerUnchecked(peer)
                    //             CHECK(attendee)
                    //             if (attendee.auto) {
                    //                 governor.onP2PError(attendee)
                    //             }
                    //             break
                    //         }
                    //         case EventType.MPIHaveMessage: {
                    //             break
                    //         }
                    //         case EventType.MPIncomingPeerEvent: {
                    //             break
                    //         }
                    //         case EventType.MPIncomingStream: {
                    //             if (page.auto_video_stream) {
                    //                 let conn = home.getAttendeeFromPeerUnchecked(peer)?.getConnectionByIdChecked(connection_id)
                    //                 CHECK(conn)
                    //                 governor.onP2PStream(conn)
                    //             }
                    //             break
                    //         }
                    //         case EventType.MPSignalGenerated: {
                    //             let { signal, connection_id } = meshpeer_event
                    //             page.backbone.send(new Backbone.PeerMessage(peer, new Backbone.BackboneSignalMessage(connection_id, signal)))
                    //             break
                    //         }
                    //         case EventType.MPWhoHasMessage: {
                    //             break
                    //         }
                    //         case EventType.SimplePeerPing: {
                    //             let attendee = home.getAttendeeFromPeerUnchecked(peer)!
                    //             let connection = attendee.getConnectionByIdChecked(connection_id)
                    //             connection.pings++
                    //             break
                    //         }
                    //         case EventType.MeshPeerTimeoutMessage: {
                    //             let { peer, connection_id } = meshpeer_event
                    //             let attendee = home.getAttendeeFromPeerUnchecked(peer)!
                    //             let connection = attendee.getConnectionByIdChecked(connection_id)
                    //             connection.stop()
                    //             break
                    //         }
                    //         default: {
                    //             console.error(meshpeer_event)
                    //             never(meshpeer_event)
                    //         }
                    //     }
                    //     break
                    // }
                    case EventType.AttendeeNewP2PConnectionEvent: {
                        let { connection_id } = attendee_event
                        console.log(`     Initiating new connection ${connection_id} to ${home.nameFromPeer(peer)}`)
                        break
                    }
                    case EventType.AttendeeStopEvent: {
                        break
                    }
                    case EventType.AttendeeReplyP2PConnectionEvent: {
                        let { connection_id } = attendee_event
                        console.log(`     Replying to connection ${connection_id} to ${home.nameFromPeer(peer)}`)
                        break
                    }
                    case EventType.AttendeeIgnoreSpamEvent: {
                        console.error(`     Ignoring Spam from Peer ${home.nameFromPeer(attendee_event.peer)}`)
                        break
                    }
                    case EventType.AttendeeMarkSpamEvent: {
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
            case EventType.TimerRunGC: {
                home.gc()
                break
            }
            case EventType.PageVideoStreamAddedEvent: {
                governor.onPageVideoStreamAdded()
                break
            }
            // case EventType.ProxyMeshPeerEvent: {
            //     let { event: message, peer, router, here_is_upstream_side, connection_id } = event
            //     let proxy_peer = page.proxy_peers.getByConnectionIdUnchecked(connection_id)
            //     CHECK(proxy_peer)
            //     console.log(`  \\_ ${EventType[message.type]} from ${home.nameFromPeer(router)}`)
            //     switch (message.type) {
            //         case EventType.MPSignalGenerated: {
            //             let { signal, connection_id } = message
            //             let out
            //             if (here_is_upstream_side) {
            //                 out = new Backbone.BackboneDnstreamProxyPeerToProxyRouterSignalEvent(connection_id, signal)
            //             } else {
            //                 out = new Backbone.BackboneUpstreamProxyPeerToProxyRouterSignalEvent(connection_id, signal)
            //             }
            //             page.backbone.send(new Backbone.PeerMessage(router, out))
            //             break
            //         }

            //         /**
            //          * This came from the router
            //          */

            //         case EventType.MPConnectMessage: {
            //             if (OPTIONS.auto_proxy_video) {
            //                 governor.onProxyConnect(proxy_peer)
            //             }
            //             break
            //         }
            //         case EventType.MPErrorMessage: {
            //             break
            //         }
            //         case EventType.MPIHaveMessage: {
            //             break
            //         }
            //         case EventType.MPIncomingStream: {
            //             console.log(`INCOMING STREAM FROM ${home.nameFromPeer(peer)}!`)
            //             let pp = page.proxy_peers.getByConnectionIdUnchecked(connection_id)
            //             CHECK(pp)
            //             pp.incoming_stream = message.stream
            //             break
            //         }
            //         case EventType.MPWhoHasMessage: {
            //             break
            //         }
            //         case EventType.SimplePeerPing: {
            //             break
            //         }
            //         case EventType.MPIncomingPeerEvent: {
            //             break
            //         }
            //         case EventType.MPConnectionEnded: {
            //             break
            //         }
            //         case EventType.MeshPeerTimeoutMessage: {
            //             let { peer, connection_id } = event
            //             let attendee = home.getAttendeeFromPeerUnchecked(peer)!
            //             let connection = attendee.getConnectionByIdChecked(connection_id)
            //             connection.stop()
            //             break
            //         }
            //         default: {
            //             never(message)
            //         }
            //     }
            //     break
            // }
            // case EventType.SignalPeerCreateProxyRouterForPeer: {
            //     let { downstream, router_peer } = event
            //     let connection_id = v4()
            //     let pp = page.proxy_peers.create(false, connection_id, router_peer, downstream)
            //     page.backbone.send(
            //         new Backbone.PeerMessage(
            //             downstream,
            //             new Backbone.BackboneUpstreamToDownstreamRequestProxyViaRouter(connection_id, router_peer)
            //         )
            //     )
            //     break
            // }

            // case EventType.ProxyRouterDownstreamSignalEvent: {
            //     let { event: mp_event, downstream_peer, connection_id } = event
            //     let proxy = page.proxy_routers.get(connection_id)!
            //     console.log(`  \\_ ${EventType[mp_event.type]} downstream_peer(${home.nameFromPeer(downstream_peer)})`)
            //     switch (mp_event.type) {
            //         case EventType.MPConnectMessage: {
            //             break
            //         }
            //         case EventType.MPErrorMessage: {
            //             console.error(mp_event.err)
            //             proxy.upstream.stop()
            //             break
            //         }
            //         case EventType.MPIHaveMessage: {
            //             break
            //         }
            //         case EventType.MPIncomingStream: {
            //             let { stream } = mp_event
            //             let pr = page.proxy_routers.get(connection_id)
            //             pr.upstream.addStream(stream)
            //             break
            //         }
            //         case EventType.MPWhoHasMessage: {
            //             break
            //         }
            //         case EventType.SimplePeerPing: {
            //             break
            //         }
            //         case EventType.MPIncomingPeerEvent: {
            //             break
            //         }
            //         case EventType.MPConnectionEnded: {
            //             proxy.upstream.stop()
            //             break
            //         }
            //         case EventType.MPSignalGenerated: {
            //             let { connection_id, signal } = mp_event
            //             page.backbone.send(
            //                 new Backbone.PeerMessage(downstream_peer,
            //                     new Backbone.BackboneProxyRouterToProxyPeerSignalEvent(connection_id, downstream_peer, signal)
            //                 )
            //             )
            //             break
            //         }
            //         case EventType.MeshPeerTimeoutMessage: {
            //             let { peer, connection_id } = mp_event
            //             let attendee = home.getAttendeeFromPeerUnchecked(peer)!
            //             let connection = attendee.getConnectionByIdChecked(connection_id)
            //             connection.stop()
            //             break
            //         }
            //         default:
            //             never(mp_event)
            //     }
            //     break
            // }
            // case EventType.ProxyRouterUpstreamSignalEvent: {
            //     let { event: mp_event, upstream_peer, connection_id } = event
            //     let proxy = page.proxy_routers.get(connection_id)!
            //     console.log(`  \\_ ${EventType[mp_event.type]} upstream_peer(${home.nameFromPeer(upstream_peer)})`)
            //     switch (mp_event.type) {
            //         case EventType.MPConnectMessage: {
            //             break
            //         }
            //         case EventType.MPErrorMessage: {
            //             console.error(mp_event.err)
            //             proxy.downstream.stop()
            //             break
            //         }
            //         case EventType.MPIHaveMessage: {
            //             break
            //         }
            //         case EventType.MPIncomingStream: {
            //             let { stream, } = mp_event
            //             let pr = page.proxy_routers.get(connection_id)
            //             pr.downstream.addStream(stream)
            //             break
            //         }
            //         case EventType.MPWhoHasMessage: {
            //             break
            //         }
            //         case EventType.SimplePeerPing: {
            //             break
            //         }
            //         case EventType.MPIncomingPeerEvent: {
            //             break
            //         }
            //         case EventType.MPConnectionEnded: {
            //             proxy.downstream.stop()
            //             break
            //         }
            //         case EventType.MPSignalGenerated: {
            //             let { connection_id, signal } = mp_event
            //             page.backbone.send(
            //                 new Backbone.PeerMessage(
            //                     upstream_peer,
            //                     new Backbone.BackboneProxyRouterToProxyPeerSignalEvent(connection_id, upstream_peer, signal)
            //                 )
            //             )
            //             break
            //         }
            //         case EventType.MeshPeerTimeoutMessage: {
            //             let { peer, connection_id } = mp_event
            //             let attendee = home.getAttendeeFromPeerUnchecked(peer)!
            //             let connection = attendee.getConnectionByIdChecked(connection_id)
            //             connection.stop()
            //             break
            //         }
            //         default:
            //             never(mp_event)
            //     }
            //     break
            // }
            case EventType.VideoStreamHealthChangeEvent: {
                let { connection_id, new_health, peer } = event
                console.log(`  \\_`, { health: MeshPeerStreamHealth[new_health], peer: home.nameFromPeer(peer) })
                let conn
                if (conn = page.home.getAttendeeFromPeerUnchecked(peer)?.getConnectionByIdChecked(connection_id)) {
                    conn.stream_health = new_health
                }
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
