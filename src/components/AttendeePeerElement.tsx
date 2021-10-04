import React from 'react'
import { Value } from "../Value"
import { Page } from "../Page"
import { Attendee } from './Attendee'
import { AttendeePeerConnectionElement } from "./AttendeePeerConnectionElement"

export function AttendeePeerElement({ peer_id, attendee }: { peer_id: string; attendee: Attendee} ) {
    let has_peers = []
    let downstream_peer = Value.Peer.FromId(peer_id)
    let proxys = Page.getProxyToPeers(downstream_peer)

    for (let proxy of proxys) {
        has_peers.push(React.createElement(AttendeePeerConnectionElement, { peer_id, downstream_peer, proxy, key: proxy.router_peer.connection_id }))
    }

    if (attendee.openConnectionCount > 0) {
        has_peers.push(
            <li className="list-group-item" key={`open-${peer_id}`}>
                {Page.page.home.nameFromPeer(downstream_peer)}
                &nbsp;
                <button onClick={click => {
                    Page.signalPeerCreateProxyRouterForPeer(attendee.peer, downstream_peer)
                }} className="btn btn-outline-primary">Open Proxy</button>
            </li>
        )
    } else {
        has_peers.push(
            <li className="list-group-item" key={peer_id}>
                {Page.page.home.nameFromPeer(downstream_peer)}</li>
        )
    }

    return <div className="attendee-peer-list-item">
        <ul className="list-group attendee-peer">
            {has_peers}
        </ul>
    </div>
}
