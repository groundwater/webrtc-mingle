import React from 'react'
import ReactDOM from 'react-dom'
import { Backbone } from "./Backbone"
import { EventType } from './EventType'
import { Home } from "./Home"
import { MeshPeerStreamHealth } from './MeshPeer'
import { PageElement } from './PageElement'
import { ProxyPeer, ProxyPeers, ProxyRouter, ProxyRouters } from './Proxy'
import { StreamMultiplex } from "./StreamMultiplex"
import { StreamPump } from './StreamPump'
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

    proxy_peers = new ProxyPeers()
    proxy_routers = new ProxyRouters()
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
    export const pump = new StreamPump<Backbone.Event | Page.Event>()
    export const muxer = new StreamMultiplex<Backbone.Event | Page.Event | ProxyPeer.Event | ProxyRouter.Event>()
    export function tryCreateProxyConnectionTo(peer: Value.Peer) {
        let attendee = page.home.whoHasConnectionToPeer(peer)
        if (attendee) {
            Page.signalPeerCreateProxyRouterForPeer(attendee.peer, peer)
        }
        return false
    }
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

            for (let proxy of page.proxy_peers.getByPeers(peer)) {
                if (proxy.incoming_stream) {
                    vv.map.set(peer.id, new VideoView(proxy.router_peer.connection_id, peer, proxy.incoming_stream))
                    continue next_attendee
                }
            }
        }

        return vv
    }

    muxer.mux(pump.listen())

    export function Init(home: Home, name: string, auto: boolean): Page {
        console.log(`Init:`, { name, auto, home })

        page = new Page(home, name, auto)

        muxer.mux(page.proxy_peers)
        muxer.mux(page.proxy_routers)

        return page
    }
    export const root = document.getElementById('root')
    export let page: Page
    export function listen() {
        return muxer.listen()
    }
    export function addVideotoProxy(proxy: ProxyPeer) {
        proxy.outgoing_stream = page.outgoing_stream
        proxy.router_peer.addStream(page.outgoing_stream!)
    }
    export function getProxyToPeers(downstream_peer: Value.Peer) {
        return page.proxy_peers.getByPeers(downstream_peer)
    }
    export function setBackbone(b: Backbone) {
        if (page.backbone) {
            page.backbone.stop()
        }
        page.backbone = b
        muxer.mux(b.listen())
    }
    export function render(Elt: React.FunctionComponent<any> = PageElement) {
        ReactDOM.render(React.createElement(Elt, page), root)
    }
    export class PageVideoStreamAddedEvent {
        type: EventType.PageVideoStreamAddedEvent = EventType.PageVideoStreamAddedEvent
    }
    export class SignalPeerCreateProxyRouterForPeer {
        type: EventType.SignalPeerCreateProxyRouterForPeer = EventType.SignalPeerCreateProxyRouterForPeer
        constructor(
            public router_peer: Value.Peer,
            public downstream: Value.Peer,
        ) { }
    }
    export class VideoStreamHealthChangeEvent {
        type: EventType.VideoStreamHealthChangeEvent = EventType.VideoStreamHealthChangeEvent
        constructor(
            public connection_id: string,
            public peer: Value.Peer,
            public new_health: MeshPeerStreamHealth,
        ) { }
    }
    export type Event =
        | PageVideoStreamAddedEvent
        | SignalPeerCreateProxyRouterForPeer
        | VideoStreamHealthChangeEvent

    export function signalPeerCreateProxyRouterForPeer(router_peer: Value.Peer, downstream_peer: Value.Peer) {
        pump.pump(new SignalPeerCreateProxyRouterForPeer(router_peer, downstream_peer))
    }
}
