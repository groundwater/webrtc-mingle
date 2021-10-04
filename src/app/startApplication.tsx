import { parse } from 'querystring'
import { abortable } from '../base/abortable'
import { CHECK } from '../base/asserts'
import { CoRunners } from '../base/CoRunner'
import { ENTER, EXIT, INFO, ERROR } from "../base/stdio"
import { DisconnectPageEvent, Page } from '../view_model/Page'
import { Connection, ConnectionEventType, WebRtcMessage } from './Connection'
import { Network } from './Network'
import { HelloMessage, HomeBroadcastMessage, OfferMessage, PeerToPeerMessage, UpdateAvatarMessage, RoomBroadcastMessage, StatusUpdate } from "./NetworkMessage"
import { AudioMicState, AudioOutState, AudioPttState } from '../view_model/Peer'
import { startChooseCamera } from "./startChooseCamera"
import { Cookies } from './Cookies'
export async function startApplication() {
    ENTER(startApplication)

    let { desktop } = parse(location.search.substr(1))

    window.onresize = () => {
        if (!Page.blurred) {
            Page.oldWidth = window.outerWidth
            Page.oldHeight = window.outerHeight
        }
    }

    let id = Cookies.getFromDocument().map.get('id')

    CHECK(id)

    let {
        video_device_id,
        audio_device_id,
    } = Page.current

    if (!video_device_id) {
        return startChooseCamera()
    }
    if (desktop) {
        INFO(['start'], { desktop })
        window.addEventListener('blur', () => {
            Page.blurred = true
            Page.WindowMinimize()
        })
        window.addEventListener('focus', () => {
            Page.blurred = false
        })
    }
    let { AVATAR_UPDATE_INTERVAL = '5000', AVATAR_UPDATE_ON = 'yes', SEND_NETWORK_CONNECT_HELLO = 'yes', } = parse(location.hash.substr(1))
    let avatar_update_interval = +AVATAR_UPDATE_INTERVAL
    let avatar_update_on = AVATAR_UPDATE_ON == 'yes'
    let send_network_connect_hello = SEND_NETWORK_CONNECT_HELLO == 'yes'
    INFO(['start'], { avatar_update_interval })
    INFO(['start'], { avatar_update_on })
    INFO(['start'], { send_network_connect_hello })
    let name = ''
    let cr = new CoRunners()
    let WINDOW = window as any
    WINDOW.Page = Page

    let url = new URL(location.href)
    let proto = url.protocol === 'https:' ? 'wss:' : 'ws:'

    let stream_MUSTCLONE = await navigator.mediaDevices.getUserMedia({ video: { deviceId: video_device_id }, audio: { deviceId: audio_device_id } })
    await Promise.all([
        ...stream_MUSTCLONE.getVideoTracks().map(t => t.applyConstraints({
            frameRate: 15,
            height: 180,
            aspectRatio: 1,
        })),
        ...stream_MUSTCLONE.getAudioTracks().map(t => t.applyConstraints({
            noiseSuppression: true,
        }))
    ])
    Page.current.me.outstream = stream_MUSTCLONE
    let mystream = stream_MUSTCLONE.clone()
    for (let track of mystream.getAudioTracks()) {
        mystream.removeTrack(track)
    }
    Page.current.me.stream = mystream
    async function load_pages() {
        // ENTER(load_pages)
        await Page.LoadRooms(Page.current.home)
        Page.render()
        setTimeout(load_pages, 15 * 1000)
        // EXIT(load_pages)
    }
    await load_pages()
    cr.run('net', net_co_runner(new Network(new WebSocket(`${proto}//${url.host}${url.pathname}/event-stream`))))
    cr.run('page', page_co_runner())
    let GLOBAL = window as any
    GLOBAL.stats = {
        Page,
        cr,
    }
    cr.run('avatars', async (abort) => {
        if (!avatar_update_on)
            return
        while (true) {
            let vid = Page.current.me.video_ref.current
            let canvas = Page.current.canvas_ref.current
            if (vid && canvas) {
                canvas.height = 180
                canvas.width = 180
                let ctx = canvas.getContext('2d')!
                ctx.clearRect(0, 0, 180, 180)
                ctx.drawImage(vid, 0, 0)
                let avatar_data_url = canvas.toDataURL('image/png')
                CHECK(avatar_data_url)
                Page.net.send(new HomeBroadcastMessage(new UpdateAvatarMessage(avatar_data_url, Page.current.room)))
            }
            await new Promise(done => setTimeout(done, avatar_update_interval))
        }
    })

    Page.ToggleSpeakerOn()
    Page.ToggleMicOn()
    Page.TogglePttOn()
    Page.render()

    function net_co_runner(net: Network): (abort: Promise<never>) => Promise<void> {
        Page.net = net
        return async function co(abort) {
            for await (let msg of abortable(abort, net.listen())) {
                INFO(['net.listen'], msg)
                switch (msg.type) {
                    case 'NetworkConnectedEvent': {
                        INFO(['net_co_runner', 'NetworkConnectedEvent'])
                        if (send_network_connect_hello) {
                            net.send(new RoomBroadcastMessage(new HelloMessage(true, name, Page.current.room, Page.current.me.audio_ptt_state, Page.current.me.audio_mic_state, Page.current.me.audio_out_state)))
                        }
                        break
                    }
                    case 'NetworkConnectionErrorEvent': {
                        INFO(['net_co_runner', 'NetworkConnectionErrorEvent'])
                        setTimeout(() => {
                            INFO(['net_co_runner', 'NetworkConnectionErrorEvent', 'setTimeout'], 'trying reconnect')
                            Page.current.peers.resetAll()
                            cr.run_anonymous(net_co_runner(new Network(new WebSocket(`${proto}//${url.host}${url.pathname}/event-stream`))))
                        }, 5000)
                        return
                    }
                    case 'NetworkDisconnectEvent': {
                        // My own websocket connection has died! on noes
                        INFO(['net_co_runner', 'NetworkDisconnectEvent'])
                        setTimeout(() => {
                            INFO(['net_co_runner', 'NetworkDisconnectEvent', 'setTimeout'], 'trying reconnect')
                            Page.current.peers.resetAll()
                            cr.run_anonymous(net_co_runner(new Network(new WebSocket(`${proto}//${url.host}${url.pathname}/event-stream`))))
                        }, 5000)
                        Page.render()
                        return
                    }
                    case 'IncomingMessage': {
                        let { from_id, message } = msg
                        INFO(['net.listen', 'IncomingMessage'], { from_id, message })
                        switch (message.type) {
                            case 'StatusMessage': {
                                let peer = Page.current.peers.getOrCreatePeerByIdWithOutStream(from_id, stream_MUSTCLONE.clone())
                                switch (message.status) {
                                    case StatusUpdate.MicOff: {
                                        peer.audio_mic_state = AudioMicState.MicIsOff
                                        break
                                    }
                                    case StatusUpdate.MicOn: {
                                        peer.audio_mic_state = AudioMicState.MicIsHot
                                        break
                                    }
                                    case StatusUpdate.SpeakerOff: {
                                        peer.audio_out_state = AudioOutState.SpeakerOff
                                        break
                                    }
                                    case StatusUpdate.SpeakerOn: {
                                        peer.audio_out_state = AudioOutState.SpeakerOn
                                        break
                                    }
                                    case StatusUpdate.PttOff: {
                                        peer.audio_ptt_state = AudioPttState.PttOff
                                        break
                                    }
                                    case StatusUpdate.PttOn: {
                                        peer.audio_ptt_state = AudioPttState.PttOn
                                        break
                                    }
                                }
                                break
                            }
                            case 'PushToTalkMessage': {
                                let { enable } = message
                                let peer = Page.current.peers.getUncheckedPeerById(from_id)
                                if (peer) {
                                    if (enable) {
                                        peer.unmuteIncomingAudio()
                                    }
                                    else if (Page.current.me.audio_mic_state === AudioMicState.MicIsOff) {
                                        peer.muteIncomingAudio()
                                    }
                                }
                                else {
                                    ERROR(`No Peer ${from_id}`)
                                }
                                break
                            }
                            case 'UpdateAvatarMessage': {
                                let peer = Page.current.peers.getOrCreatePeerByIdWithOutStream(from_id, stream_MUSTCLONE.clone())
                                peer.image_url = message.url
                                if (!peer.getBestOpenConnectionOrNull() && message.room === Page.current.room) {
                                    net.send(new PeerToPeerMessage(from_id, new HelloMessage(true, name, Page.current.room, Page.current.me.audio_ptt_state, Page.current.me.audio_mic_state, Page.current.me.audio_out_state)))
                                }
                                break
                            }
                            case 'offer': {
                                let { } = message
                                let peer = Page.current.peers.getOrCreatePeerByIdWithOutStream(from_id, stream_MUSTCLONE.clone())
                                let conn = peer.getOrCreateNewFromIdWithOffer(message.connection_id, message.offer)
                                cr.run_anonymous(connection_co_runner(net, conn, from_id))
                                break
                            }
                            case 'goodbye': {
                                let peer = Page.current.peers.getOrCreatePeerByIdWithOutStream(from_id, stream_MUSTCLONE.clone())
                                peer.clearAllConnections()
                                Page.current.peers.removeById(peer.id)
                                break
                            }
                            case 'info': {
                                // setTimeout(() => net.send(new PeerToPeerMessage(from_id, new InfoMessage('hi'))), 5000)
                                break
                            }
                            case 'hello': {
                                let { init, room: their_room, out, ptt, mic } = message
                                let peer = Page.current.peers.getOrCreatePeerByIdWithOutStream(from_id, stream_MUSTCLONE.clone())
                                peer.name = message.name
                                peer.audio_out_state = out
                                peer.audio_mic_state = mic
                                peer.audio_ptt_state = ptt
                                if (init) {
                                    if (Page.current.room === their_room) {
                                        // They are in our room so we should intitiate a p2p
                                        peer.clearAllConnections()
                                        let conn = peer.createNewConnection()
                                        cr.run_anonymous(connection_co_runner(net, conn, from_id))
                                    }
                                    else {
                                        // They are not in our room
                                        // Do not intitiate a p2p
                                    }
                                    // Send Hello Back
                                    net.send(new PeerToPeerMessage(from_id, new HelloMessage(false, name, Page.current.room, Page.current.me.audio_ptt_state, Page.current.me.audio_mic_state, Page.current.me.audio_out_state)))
                                }
                                break
                            }
                            default:
                            //
                        }
                        Page.render()
                        break
                    }
                }
            }
        }
    }
    function page_co_runner(): (abort: Promise<never>) => Promise<void> {
        return async (abort) => {
            ENTER(page_co_runner)
            for await (let next of abortable(abort, Page)) {
                switch (next.type) {
                    case 'disconnect': {
                        break
                    }
                    default:
                        console.error(next)
                        throw new Error(`Unexpected ${next.type}`)
                }
                Page.render()
            }
            EXIT(page_co_runner)
        }
    }
    function connection_co_runner(net: Network, conn: Connection, from_id: string): (abort: Promise<never>) => Promise<void> {
        return async (abort) => {
            all: for await (let msg of abortable(abort, conn.listen(abort))) {
                INFO(['con.listen'], msg)
                switch (msg.type) {
                    case ConnectionEventType.ConnectionMediaStream: {
                        let peer = Page.current.peers.getOrCreatePeerByIdWithOutStream(from_id, stream_MUSTCLONE)
                        peer.addStream(msg.stream)
                        if (Page.current.me.audio_mic_state === AudioMicState.MicIsOff) {
                            peer.muteOutgoingAudio()
                        }
                        if (Page.current.me.audio_out_state === AudioOutState.SpeakerOff) {
                            peer.muteIncomingAudio()
                        }
                        break
                    }
                    case ConnectionEventType.ConnectionConnected: {
                        let peer = Page.current.peers.getOrCreatePeerByIdWithOutStream(from_id, stream_MUSTCLONE)
                        conn.send(new WebRtcMessage('ping'))
                        conn.addStream(peer.outgoing_stream)
                        Page.current.peers.getOrCreatePeerByIdWithOutStream(from_id, stream_MUSTCLONE)
                        break
                    }
                    case ConnectionEventType.ConnectionData: {
                        break
                    }
                    case ConnectionEventType.ConnectionOffered: {
                        net.send(new PeerToPeerMessage(from_id, new OfferMessage(conn.id, msg.offer)))
                        break
                    }
                    case ConnectionEventType.ConnectionError: {
                        Page.notify(new DisconnectPageEvent(from_id))
                        break
                    }
                    case ConnectionEventType.ConnectionEnded: {
                        if (Page.current.peers.hasPeerWithId(from_id)) {
                            // Reestablish connection if we were the initiator last time
                            if (conn.initiiator) {
                                let peer = Page.current.peers.getOrCreatePeerByIdWithOutStream(from_id, stream_MUSTCLONE)
                                let conn = peer.createNewConnection()
                                cr.run_anonymous(connection_co_runner(net, conn, from_id))
                            }
                            else {
                            }
                        }
                        else {
                            // The peer has disconnected
                            // Do nothing
                        }
                        break
                    }
                    default: {
                    }
                }
                Page.render()
                // Update the window size to acommodate more pople
                if (Page.blurred) {
                    Page.WindowMinimize()
                }
            }
            Page.render()
        }
    }
    await cr.await_all()
    EXIT(startApplication)
}
