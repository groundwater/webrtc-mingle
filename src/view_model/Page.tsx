import React from 'react'
import ReactDOM from 'react-dom'
import { Network, NetworkStatus } from '../app/Network'
import { PeerToPeerMessage, PushToTalkMessage, RoomBroadcastMessage, StatusUpdate, StatusUpdateMessage } from '../app/NetworkMessage'
import { MinPageElement } from '../view/MinPageElement'
import { PageElement } from "../view/PageElement"
import { Me } from './Me'
import { AudioMicState, AudioOutState, AudioPttState, Peer, PeerTargetState } from './Peer'
import { PeerManager } from './PeerManager'
import { Rooms } from './Rooms'

export class DisconnectPageEvent {
    type: 'disconnect' = 'disconnect'
    constructor(
        public peer_id: string
    ) { }
}
export type PageEvent =
    | DisconnectPageEvent

export class Page {
    constructor(
        public home: string,
        public room: string,
        public me = new Me(),
        public peers = new PeerManager(),
        public rooms = new Rooms(),
        public canvas_ref = React.createRef<HTMLCanvasElement>(),
        public video_device_id: string = '',
        public audio_device_id: string = '',
    ) { }
    static element = PageElement
    static current: Page
    static notify_next: any
    static net: Network
    static notify(p: PageEvent) {
        this.notify_next(p)
    }
    static async LoadRooms(home: string) {
        let rooms = await fetch(`/api/home/${home}/list-rooms`, {}).then(r => r.json())
        this.current.rooms.fromJSON(rooms)
    }
    static async *[Symbol.asyncIterator](): AsyncGenerator<PageEvent> {
        while (true) {
            yield new Promise<PageEvent>(done => this.notify_next = done)
        }
    }
    static rootElement = document.getElementById('root')
    static render() {
        ReactDOM.render(React.createElement(this.element, this.current), this.rootElement)
    }
    static PushToTalkStopPeerById(peer: Peer) {
        if (Page.current.me.audio_out_state == AudioOutState.SpeakerOff) {
            peer.muteOutgoingAudio()
        }
        peer.target_state = PeerTargetState.IsNotTarget
        this.net.send(
            new PeerToPeerMessage(peer.id, new PushToTalkMessage(false)))
    }
    static PushToTalkStartPeerById(peer: Peer) {
        peer.unmuteOutgoingAudio()
        peer.target_state = PeerTargetState.IsPttTarget
        this.net.send(
            new PeerToPeerMessage(peer.id, new PushToTalkMessage(true)))
    }
    static blurred = false
    static oldWidth = window.outerWidth
    static oldHeight = window.outerHeight
    static WindowMinimize() {
        console.log(`Minimize window`)
        if (!this.blurred) return

        let numPeers = 1
        for (let peer of Page.current.peers) {
            if (peer.incoming_stream) {
                numPeers++
            }
        }
        let nPeersPeerRow = 5
        let newWidth = Math.min(180 * numPeers, 180 * nPeersPeerRow)
        let newHeight = Math.min(200, 200 * Math.ceil(numPeers / nPeersPeerRow))
        this.oldWidth = window.outerWidth
        this.oldHeight = window.outerHeight
        window.resizeTo(newWidth, newHeight)
        this.element = MinPageElement
        this.render()

    }
    static WindowRestoreRegularSize() {
        this.blurred = false
        console.log('FOCUS')
        window.resizeTo(this.oldWidth, this.oldHeight)
        Page.element = PageElement
        Page.render()
    }
    static SpeakerState() {
        if (this.current.me.audio_out_state === AudioOutState.SpeakerOn) {
            return 'free'
        } else {
            return 'mute'
        }
    }
    static PttState() {
        if (this.current.me.audio_ptt_state === AudioPttState.PttOn) {
            return 'ptt'
        } else {
            return 'noptt'
        }
    }
    static MicState() {
        if (this.current.me.audio_mic_state === AudioMicState.MicIsHot) {
            return 'hot'
        } else {
            return 'off'
        }
    }

    /**
     * PTT
     */
    static TogglePTT() {
        let turn_ptt_off = this.current.me.audio_ptt_state === AudioPttState.PttOn
        if (turn_ptt_off) {
            this.TogglePttOff()
        } else {
            this.TogglePttOn()
        }
    }
    static TogglePttOn() {
        this.current.me.audio_ptt_state = AudioPttState.PttOn
        Page.net.send(new RoomBroadcastMessage(new StatusUpdateMessage(StatusUpdate.PttOn)))
    }
    static TogglePttOff() {
        this.current.me.audio_ptt_state = AudioPttState.PttOff
        Page.net.send(new RoomBroadcastMessage(new StatusUpdateMessage(StatusUpdate.PttOff)))
    }


    /**
     * Mic
     */
    static ToggleMicOff() {
        for (let peer of this.current.peers) {
            peer.muteOutgoingAudio()
        }
        this.current.me.audio_mic_state = AudioMicState.MicIsOff
        Page.net.send(new RoomBroadcastMessage(new StatusUpdateMessage(StatusUpdate.MicOff)))
    }
    static ToggleMicOn() {
        for (let peer of this.current.peers) {
            peer.unmuteOutgoingAudio()
        }
        this.current.me.audio_mic_state = AudioMicState.MicIsHot
        if (Page.net && Page.net.status === NetworkStatus.Connected) {
            Page.net.send(new RoomBroadcastMessage(new StatusUpdateMessage(StatusUpdate.MicOn)))
        }
    }
    static ToggleMic() {
        let mute_mic = this.current.me.audio_mic_state === AudioMicState.MicIsHot
        if (mute_mic) {
            this.ToggleMicOff()
        } else {
            this.ToggleMicOn()
        }
    }


    /**
     * Speaker
     */
    static ToggleSpeakerOff() {
        for (let peer of this.current.peers) {
            peer.muteIncomingAudio()
        }
        this.current.me.audio_out_state = AudioOutState.SpeakerOff
        Page.net.send(new RoomBroadcastMessage(new StatusUpdateMessage(StatusUpdate.SpeakerOff)))
    }
    static ToggleSpeakerOn() {
        for (let peer of this.current.peers) {
            peer.unmuteIncomingAudio()
        }
        this.current.me.audio_out_state = AudioOutState.SpeakerOn
        if (Page.net && Page.net.status === NetworkStatus.Connected) {
            Page.net.send(new RoomBroadcastMessage(new StatusUpdateMessage(StatusUpdate.SpeakerOn)))
        }
    }
    static ToggleSpeaker() {
        let mute_speaker = this.current.me.audio_out_state === AudioOutState.SpeakerOn
        if (mute_speaker) {
            this.ToggleSpeakerOff()
        } else {
            this.ToggleSpeakerOn()
        }
    }

}
