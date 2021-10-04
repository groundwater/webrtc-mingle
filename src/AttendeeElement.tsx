import React, { useEffect } from 'react'
import { Value } from "./Value"
import { Backbone } from "./Backbone"
import { unique, map } from "./itertools"
import { Page } from "./Page"
import { Attendee } from './Attendee'
import { ConnectionElement } from './PageElement'
import { MeshPeer } from './MeshPeer'
import { play, fit180 } from './play'
import { CHECK } from "./CHECK"
import { ProxyPeer, ProxyRouter } from './Proxy'

export function AttendeePeerConnectionElement({ peer_id, downstream_peer, proxy }: {
    peer_id: string,
    downstream_peer: Value.Peer,
    proxy: ProxyPeer,
}) {
    let video = <div>No Incoming Video Stream</div>
    if (proxy.incoming_stream) {
        let videoref = React.createRef<HTMLVideoElement>()

        useEffect(() => {
            if (!videoref.current!.srcObject) {
                play(videoref.current!, proxy!.incoming_stream!)
            }
            fit180(videoref.current!)
        })

        video = <video ref={videoref}></video>
    }

    CHECK(proxy)

    switch (proxy.router_peer.state) {
        case MeshPeer.State.Connected: {
            let outgoing
            if (Page.page.outgoing_stream) {
                if (!proxy.outgoing_stream) {
                    outgoing = <button className="btn btn-sm btn-primary" onClick={click => {
                        Page.addVideotoProxy(proxy!)
                    }}>Send Video</button>
                } else {
                    outgoing = <span>Sending Stream</span>
                }
            } else {
                outgoing = <button title="Enable Video to Send" disabled className="btn btn-sm btn-primary">Add Video</button>
            }
            return (<li className={`list-group-item-success list-group-item`} key={peer_id}>
                {Page.page.home.nameFromPeer(downstream_peer)}
                :&nbsp;
                <span>Connected</span>
                &nbsp;
                {outgoing}
                <div>
                    {video}
                    <button className="btn btn-sm btn-outline-danger" onClick={click => {
                        proxy.router_peer.stop()
                    }}>End</button>
                </div>
            </li>)
            break
        }
        case MeshPeer.State.Ended: {
            return (<li className={`list-group-item-danger list-group-item`} key={peer_id}>
                {Page.page.home.nameFromPeer(downstream_peer)}
                :&nbsp;
                <span>Ended</span>
                <button className="btn btn-sm btn-danger" onClick={click => {
                    Page.page.proxy_peers.deleteProxy(proxy)
                    Page.render()
                }}>Clear</button>
                <div>{video}</div>
            </li>)
            break
        }
        case MeshPeer.State.Error: {
            return (<li className={`list-group-item-danger list-group-item`} key={peer_id}>
                {Page.page.home.nameFromPeer(downstream_peer)}
                :&nbsp;
                <span>Error</span>
                <button className="btn btn-sm btn-danger" onClick={click => {
                    Page.page.proxy_peers.deleteProxy(proxy)
                    Page.render()
                }}>Clear</button>
                <div>{video}</div>
            </li>)
            break
        }
        case MeshPeer.State.Offered: {
            return (<li className={`list-group-item-info list-group-item`} key={peer_id}>
                {Page.page.home.nameFromPeer(downstream_peer)}
                :&nbsp;
                <span>Offered</span>
                <button className="btn btn-sm btn-primary" onClick={click => {
                    proxy.router_peer.stop()
                }}>Cancel</button>
            </li>)

            break
        }
        case MeshPeer.State.Ready: {
            return (<li className={`list-group-item-info list-group-item`} key={peer_id}>
                {Page.page.home.nameFromPeer(downstream_peer)}
                :&nbsp;
                <span>Ready</span>
                <button className="btn btn-sm btn-primary" onClick={click => {
                    proxy.router_peer.stop()
                }}>Cancel</button>
            </li>)

            break
        }
        default:
            throw new Error(`Oops`)
    }
}
export function AttendeePeerElement({ peer_id, attendee }: { peer_id: string, attendee: Attendee }) {
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
    let routers = []

    function ProxyListElementStopButton(router: ProxyRouter) {
        return <button className="btn btn-sm btn-outline-danger" onClick={click => {
            click.preventDefault()
            router.downstream.stop()
            router.upstream.stop()
        }}>Close</button>
    }
    function ProxyListElementClearButton(router: ProxyRouter) {
        return <button className="btn btn-sm btn-danger" onClick={click => {
            click.preventDefault()
            Page.page.proxy_routers.clear(router)
            Page.render()
        }}>Clear</button>
    }

    function ProxyListElement(router: ProxyRouter, meshpeer: MeshPeer) {
        let btn, cls
        switch (meshpeer.state) {
            case MeshPeer.State.Connected: {
                btn = ProxyListElementStopButton(router)
                cls = 'list-group-item-success'
                break
            }
            case MeshPeer.State.Ended:
            case MeshPeer.State.Error: {
                btn = ProxyListElementClearButton(router)
                cls = 'list-group-item-danger'
                break
            }
        }
        return <li className={`list-group-item ${cls}`} key={router.downstream.connection_id}>
            <div>
                Proxying To {Page.page.home.nameFromPeer(meshpeer.peer)}: {MeshPeer.State[meshpeer.state]}
                &nbsp;{btn}
            </div>
        </li>
    }
    for (let router of Page.page.proxy_routers) {
        if (router.upstream.peer.id === attendee.peer.id) {
            routers.push(
                ProxyListElement(router, router.downstream)
            )
        }
        if (router.downstream.peer.id === attendee.peer.id) {
            routers.push(
                ProxyListElement(router, router.upstream)
            )
        }
    }
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
                <ul className="list-group">{
                    routers
                }</ul>
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
