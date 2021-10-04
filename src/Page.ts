import React from 'react'
import ReactDOM from 'react-dom'
import { Backbone } from "./Backbone"
import { PageElement } from './components/PageElement'
import { EEventType } from './EventType'
import { Home } from "./Home"
import { MeshPeerStreamHealth } from './MeshPeer'
import { UAppendableStream } from './util/AppendableStream'
import { UStreamMultiplex } from "./util/StreamMultiplex"
import { Value } from './Value'

export class Page {
    constructor(
        public home: Home,
        public name: string,
        public auto: boolean,
    ) { }
    devices: MediaDeviceInfo[] = [];
    outgoing_stream?: MediaStream
    my_id!: string
    backbone!: Backbone
    key = 'pageroot'

    auto_try_reconnect = this.auto
    auto_video_stream = this.auto
}

export class VideoView {
    constructor(
        public id: string,
        public peer: Value.Peer,
        public stream: MediaStream,
    ) { }
}

export class VideoViews {
    constructor(
        public map = new Map<string, VideoView>()
    ) { }
    [Symbol.iterator]() {
        return this.map.values()
    }
}

export namespace Page {
    export const pump = new UAppendableStream<Backbone.Event | Page.Event>()
    export const muxer = new UStreamMultiplex<Backbone.Event | Page.Event /*| ProxyPeer.Event | ProxyRouter.Event */>()
    export function get_video_views() {
        let vv = new VideoViews()

        next_attendee:
        for (let attendee of page.home.attendees()) {
            let peer = attendee.peer
            let conn = attendee.get_connection_with_video()

            if (conn?.incoming_stream) {
                vv.map.set(peer.id, new VideoView(conn.connection_id, peer, conn.incoming_stream))
                continue next_attendee
            }
        }

        return vv
    }

    muxer.addStreamToMultiplex(pump.listen())

    export function Init(home: Home, name: string, auto: boolean): Page {
        console.log(`Init:`, { name, auto, home })

        page = new Page(home, name, auto)

        return page
    }
    export const root = document.getElementById('root')
    export let page: Page
    export function listen() {
        return muxer.listen()
    }
    export function setBackbone(b: Backbone) {
        if (page.backbone) {
            page.backbone.stop()
        }
        page.backbone = b
        muxer.addStreamToMultiplex(b.listen())
    }
    export function render(Elt: React.FunctionComponent<any> = PageElement) {
        ReactDOM.render(React.createElement(Elt, page), root)
    }
    export class PageVideoStreamAddedEvent {
        type: EEventType.PageVideoStreamAddedEvent = EEventType.PageVideoStreamAddedEvent
    }
    export class VideoStreamHealthChangeEvent {
        type: EEventType.VideoStreamHealthChangeEvent = EEventType.VideoStreamHealthChangeEvent
        constructor(
            public connection_id: string,
            public peer: Value.Peer,
            public new_health: MeshPeerStreamHealth,
        ) { }
    }
    export type Event =
        | PageVideoStreamAddedEvent
        | VideoStreamHealthChangeEvent
}
