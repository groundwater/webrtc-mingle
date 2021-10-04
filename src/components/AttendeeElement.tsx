import React from 'react'
import { Backbone } from "../Backbone"
import { Page } from "../Page"
import { map, unique } from "../util/itertools"
import { Attendee } from './Attendee'
// import { ProxyRouter } from '../Proxy'
import { AttendeePeerElement } from './AttendeePeerElement'
import { ConnectionElement } from "./ConnectionElement"

export function AttendeeElement(attendee: Attendee, order: number) {
    let here_disabled = Page.page.backbone.state !== Backbone.State.Connected
    let there_disabled = attendee.ws_status !== Attendee.WsStatus.Connected
    let disabled = here_disabled || there_disabled

    let unique_peers = unique(map(attendee.has_peers.values(), ({ peer: { id } }) => id))
    let has_peers = []
    for (let peer_id of unique_peers) {
        if (peer_id !== Page.page.my_id) {
            has_peers.push(React.createElement(AttendeePeerElement, { attendee, peer_id, key: attendee.peer.id }))
        }
    }

    let connections = Array.from(attendee.connections.values()).map(connection => ConnectionElement(connection, disabled))
    let is_spam = attendee.is_spam ? 'is-spam' : ''
    let status = disabled ?
        <small><span className="badge badge-danger">Disconnected</span></small>
        :
        <small><span className="badge badge-success">Connected</span></small>
    let auto = attendee.auto ? 'Auto' : 'Hold'
    // let routers = []
    // function ProxyListElementStopButton(router: ProxyRouter) {
    //     return <button className="btn btn-sm btn-outline-danger" onClick={click => {
    //         click.preventDefault()
    //         router.downstream.stop()
    //         router.upstream.stop()
    //     }}>Close</button>
    // }
    // function ProxyListElementClearButton(router: ProxyRouter) {
    //     return <button className="btn btn-sm btn-danger" onClick={click => {
    //         click.preventDefault()
    //         Page.page.proxy_routers.clear(router)
    //         Page.render()
    //     }}>Clear</button>
    // }

    // function ProxyListElement(router: ProxyRouter, meshpeer: MeshPeer) {
    //     let btn, cls
    //     switch (meshpeer.state) {
    //         case MeshPeer.State.Connected: {
    //             btn = ProxyListElementStopButton(router)
    //             cls = 'list-group-item-success'
    //             break
    //         }
    //         case MeshPeer.State.Ended:
    //         case MeshPeer.State.Error: {
    //             btn = ProxyListElementClearButton(router)
    //             cls = 'list-group-item-danger'
    //             break
    //         }
    //     }
    //     return <li className={`list-group-item ${cls}`} key={router.downstream.connection_id}>
    //         <div>
    //             Proxying To {Page.page.home.nameFromPeer(meshpeer.peer)}: {MeshPeer.State[meshpeer.state]}
    //             &nbsp;{btn}
    //         </div>
    //     </li>
    // }
    // for (let router of Page.page.proxy_routers) {
    //     if (router.upstream.peer.id === attendee.peer.id) {
    //         routers.push(
    //             ProxyListElement(router, router.downstream)
    //         )
    //     }
    //     if (router.downstream.peer.id === attendee.peer.id) {
    //         routers.push(
    //             ProxyListElement(router, router.upstream)
    //         )
    //     }
    // }
    return (<div key={attendee.peer.id} className="col-md-6 col-xl-4">
        <div className={`attendee-list-item ${is_spam}`} style={{ order }}>
            <div className="attendee">
                <div><h2>{attendee.name} {status}</h2></div>
                <div className="btn-group btn-group-toggle">
                    <button disabled={disabled} className="btn btn-outline-primary" onClick={click => {
                        click.preventDefault()
                        attendee.initiateNewP2PConnection()
                    }}>New Connection</button>
                    <button disabled={disabled} className="btn btn-outline-secondary" onClick={click => {
                        click.preventDefault()
                        Page.page.backbone.sendPeer(attendee.peer, new Backbone.BackboneBumpMessage())
                    }}>Bump</button>
                    <button disabled={here_disabled} className="btn btn-outline-danger" onClick={click => {
                        click.preventDefault()
                        attendee.reportSpam()
                        Page.render()
                    }}>Block</button>
                </div>
                <div>
                    <h3>Peers:</h3>
                    <div className="attendee-peer-list">{has_peers}</div>
                </div>
                {/* <ul className="list-group">{
                    routers
                }</ul> */}
                <div className="connection-list">
                    <h3>Connections: <button className={`btn btn-sm ${attendee.auto ? 'btn-outline-primary' : 'btn-primary'}`} onClick={click => {
                        attendee.auto = !attendee.auto
                        Page.render()
                    }}>{auto}</button></h3>
                    {connections}
                </div>
            </div>
        </div>
    </div >)
}
