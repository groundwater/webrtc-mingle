import { Backbone } from "./Backbone"
import { Attendee } from './components/Attendee'
import { MeshPeer } from "./MeshPeer"
import { Page } from './Page'
import { CHECK } from './util/CHECK'
export class Governor {
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
    constructor(public home_name: string) { }
}
