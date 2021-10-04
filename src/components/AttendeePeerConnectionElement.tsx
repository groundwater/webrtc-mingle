// import React, { useEffect } from 'react'
// import { Value } from "../Value"
// import { Page } from "../Page"
// import { MeshPeer } from '../MeshPeer'
// import { play, fit180 } from './util/play'
// import { CHECK } from "../util/CHECK"
// import { ProxyPeer } from '../Proxy'


// export function AttendeePeerConnectionElement({ peer_id, downstream_peer, proxy }: {
//     peer_id: string
//     downstream_peer: Value.Peer
//     proxy: ProxyPeer
// }) {
//     let video = <div>No Incoming Video Stream</div>
//     if (proxy.incoming_stream) {
//         let videoref = React.createRef<HTMLVideoElement>()

//         useEffect(() => {
//             if (!videoref.current!.srcObject) {
//                 play(videoref.current!, proxy!.incoming_stream!)
//             }
//             fit180(videoref.current!)
//         })

//         video = <video ref={videoref}></video>
//     }

//     CHECK(proxy)

//     switch (proxy.router_peer.state) {
//         case MeshPeer.State.Connected: {
//             let outgoing
//             if (Page.page.outgoing_stream) {
//                 if (!proxy.outgoing_stream) {
//                     outgoing = <button className="btn btn-sm btn-primary" onClick={click => {
//                         Page.addVideotoProxy(proxy!)
//                     }}>Send Video</button>
//                 } else {
//                     outgoing = <span>Sending Stream</span>
//                 }
//             } else {
//                 outgoing = <button title="Enable Video to Send" disabled className="btn btn-sm btn-primary">Add Video</button>
//             }
//             return (<li className={`list-group-item-success list-group-item`} key={peer_id}>
//                 {Page.page.home.nameFromPeer(downstream_peer)}
//                 :&nbsp;
//                 <span>Connected</span>
//                 &nbsp;
//                 {outgoing}
//                 <div>
//                     {video}
//                     <button className="btn btn-sm btn-outline-danger" onClick={click => {
//                         proxy.router_peer.stop()
//                     }}>End</button>
//                 </div>
//             </li>)
//             break
//         }
//         case MeshPeer.State.Ended: {
//             return (<li className={`list-group-item-danger list-group-item`} key={peer_id}>
//                 {Page.page.home.nameFromPeer(downstream_peer)}
//                 :&nbsp;
//                 <span>Ended</span>
//                 <button className="btn btn-sm btn-danger" onClick={click => {
//                     Page.page.proxy_peers.deleteProxy(proxy)
//                     Page.render()
//                 }}>Clear</button>
//                 <div>{video}</div>
//             </li>)
//             break
//         }
//         case MeshPeer.State.Error: {
//             return (<li className={`list-group-item-danger list-group-item`} key={peer_id}>
//                 {Page.page.home.nameFromPeer(downstream_peer)}
//                 :&nbsp;
//                 <span>Error</span>
//                 <button className="btn btn-sm btn-danger" onClick={click => {
//                     Page.page.proxy_peers.deleteProxy(proxy)
//                     Page.render()
//                 }}>Clear</button>
//                 <div>{video}</div>
//             </li>)
//             break
//         }
//         case MeshPeer.State.Offered: {
//             return (<li className={`list-group-item-info list-group-item`} key={peer_id}>
//                 {Page.page.home.nameFromPeer(downstream_peer)}
//                 :&nbsp;
//                 <span>Offered</span>
//                 <button className="btn btn-sm btn-primary" onClick={click => {
//                     proxy.router_peer.stop()
//                 }}>Cancel</button>
//             </li>)

//             break
//         }
//         case MeshPeer.State.Ready: {
//             return (<li className={`list-group-item-info list-group-item`} key={peer_id}>
//                 {Page.page.home.nameFromPeer(downstream_peer)}
//                 :&nbsp;
//                 <span>Ready</span>
//                 <button className="btn btn-sm btn-primary" onClick={click => {
//                     proxy.router_peer.stop()
//                 }}>Cancel</button>
//             </li>)

//             break
//         }
//         default:
//             throw new Error(`Oops`)
//     }
// }
