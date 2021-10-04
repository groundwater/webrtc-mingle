import { Value } from "./Value"
import { Backbone } from "./Backbone"
import { Page } from './Page'
import { CHECK } from './CHECK'
import { Attendee } from "./Attendee"
import { MeshPeer } from "./MeshPeer"
import { ProxyPeer } from "./Proxy"
export class Governor {
    onP2PError(attendee: Attendee) {
        console.log(`Error Creating Connection - Trying Proxy`)
        Page.tryCreateProxyConnectionTo(attendee.peer)
    }
    onPageVideoStreamAdded() {
        let { page } = Page
        let { home } = page
        CHECK(page.outgoing_stream)
        for (let { peer } of page.home.attendees()) {
            let attendee = home.getAttendeeFromPeerUnchecked(peer)
            CHECK(attendee)
            let conn_id = attendee.getFirstOpenConnection()
            if (conn_id) {
                let conn = attendee.getConnectionByIdChecked(conn_id)!
                conn.addStream(page.outgoing_stream)
            }
        }
    }
    onBackboneConnect() { }
    onBackboneDisconnect() {
        console.log(`Auto Reconnect after 1s`)
        setTimeout(() => {
            Page.setBackbone(Backbone.CreateWithHome(Page.page.home.name))
        }, 1000)
    }
    onAttendeeHello() { }
    onAttendeeHelloReply(at: Attendee) {
        if (at.openOrOfferedConnectionCount < 1 && at.initiator) {
            at.initiateNewP2PConnection()
        }
    }
    onAttendeeGoodbye() { }
    onP2PConnect(conn: MeshPeer) {
        if (Page.page.outgoing_stream) {
            conn.addStream(Page.page.outgoing_stream)
        }
    }
    onP2PDisconnect(attendee: Attendee, conn: MeshPeer) {
        if (attendee.openOrOfferedConnectionCount < 1 && attendee.initiator) {
            attendee.initiateNewP2PConnection()
        }
        attendee.connections.delete(conn.connection_id)
    }
    onP2PStream(conn: MeshPeer) {
        if (Page.page.outgoing_stream) {
            conn.addStream(Page.page.outgoing_stream)
        }
    }
    onP2PStreamHealthChange() { }
    onProxyConnect(proxy: ProxyPeer) {
        Page.addVideotoProxy(proxy)
    }
    onProxyDisconnect() { }
    onProxyStream() { }
    onProxyStreamHealthChange() { }
    onProxyHasPeer(attendee: Attendee, peer: Value.Peer) {
        // let not_me = peer.id !== Page.page.my_id
        // let existing_proxies = Page.page.proxy_peers.getByPeers(peer)
        // if (not_me && existing_proxies.length === 0) {
        //     Page.signalPeerCreateProxyRouterForPeer(attendee.peer, peer)
        // }
    }
    constructor(public home_name: string) { }
}