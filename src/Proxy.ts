// import { EventType } from "./EventType"
// import { MeshPeer } from "./MeshPeer"
// import { StreamMultiplex } from "./StreamMultiplex"
// import { Value } from "./Value"
// export class ProxyPeers {
//     deleteProxy(proxy: ProxyPeer) {
//         this.map.delete(proxy.router_peer.connection_id)
//     }
//     getByConnectionIdUnchecked(connection_id: string) {
//         return this.map.get(connection_id)
//     }
//     getByPeers(peer: Value.Peer) {
//         let out = []
//         for (let proxy of this.map.values()) {
//             if (proxy.peer.id === peer.id) {
//                 out.push(proxy)
//             }
//         }
//         return out
//     }
//     create(peer_is_upstream: boolean, connection_id: string, router: Value.Peer, peer: Value.Peer) {
//         let pp = ProxyPeer.CreateFrom(peer_is_upstream, connection_id, router, peer)
//         this.mux.mux(pp)
//         this.map.set(connection_id, pp)
//         return pp
//     }
//     getBy(connection_id: string) {
//         return this.map.get(connection_id)
//     }
//     [Symbol.asyncIterator]() {
//         return this.mux.listen()
//     }
//     private map = new Map<string, ProxyPeer>()
//     private mux = new StreamMultiplex<ProxyPeer.Event>()
// }
// export class ProxyPeer {
//     outgoing_stream?: MediaStream
//     incoming_stream?: MediaStream
//     incoming_stream_delay: number = 0
//     private constructor(
//         public here_is_upstream_side: boolean,
//         public peer: Value.Peer,
//         public router_peer: MeshPeer,
//         public muxer = new StreamMultiplex<ProxyPeer.Event>()
//     ) {
//         this.muxer.mux(async function* () {
//             for await (let message of router_peer.listen()) {
//                 yield new ProxyPeer.ProxyMeshPeerEvent(router_peer.connection_id, here_is_upstream_side, peer, router_peer.peer, message)
//             }
//         }())
//     }
//     static CreateFrom(here_is_upstream_side: boolean, connection_id: string, router: Value.Peer, peer: Value.Peer) {
//         return new ProxyPeer(
//             here_is_upstream_side,
//             peer,
//             MeshPeer.CreateForPeer(connection_id, router, false),
//         )
//     }
//     [Symbol.asyncIterator]() {
//         return this.muxer.listen()
//     }
// }
// export namespace ProxyPeer {
//     export class ProxyMeshPeerEvent {
//         type: EventType.ProxyMeshPeerEvent = EventType.ProxyMeshPeerEvent;
//         constructor(
//             public connection_id: string,
//             public here_is_upstream_side: boolean,
//             public peer: Value.Peer,
//             public router: Value.Peer,
//             public event: MeshPeer.Message
//         ) { }
//     }
//     export type Event =
//         ProxyMeshPeerEvent
// }
// export class ProxyRouter {
//     constructor(
//         public upstream: MeshPeer,
//         public downstream: MeshPeer,
//         public muxer = new StreamMultiplex<ProxyRouter.Event>()
//     ) {
//         muxer.mux(async function* () {
//             for await (let msg of upstream.listen()) {
//                 yield new ProxyRouter.ProxyRouterUpstreamSignalEvent(upstream.connection_id, upstream.peer, msg)
//             }
//         }())
//         this.muxer.mux(async function* () {
//             for await (let msg of downstream.listen()) {
//                 console.log(`initupstream MeshPeer Message`, msg)
//                 yield new ProxyRouter.ProxyRouterDownstreamSignalEvent(downstream.connection_id, downstream.peer, msg)
//             }
//         }())
//     }
//     [Symbol.asyncIterator]() {
//         return this.muxer.listen()
//     }
//     static CreateFromPeers(connection_id: string, upstream: Value.Peer, downstream: Value.Peer) {
//         return new ProxyRouter(
//             MeshPeer.CreateForPeer(connection_id, upstream, true),
//             MeshPeer.CreateForPeer(connection_id, downstream, true),
//         )
//     }
// }
// export namespace ProxyRouter {
//     export class ProxyRouterUpstreamSignalEvent {
//         type: EventType.ProxyRouterUpstreamSignalEvent = EventType.ProxyRouterUpstreamSignalEvent
//         constructor(
//             public connection_id: string,
//             public upstream_peer: Value.Peer,
//             public event: MeshPeer.Message
//         ) { }
//     }
//     export class ProxyRouterDownstreamSignalEvent {
//         type: EventType.ProxyRouterDownstreamSignalEvent = EventType.ProxyRouterDownstreamSignalEvent
//         constructor(
//             public connection_id: string,
//             public downstream_peer: Value.Peer,
//             public event: MeshPeer.Message
//         ) { }
//     }
//     export type Event =
//         | ProxyRouterDownstreamSignalEvent
//         | ProxyRouterUpstreamSignalEvent
// }
// export class ProxyRouters {
//     clear(router: ProxyRouter) {
//         this.map.delete(router.downstream.connection_id)
//     }
//     private map = new Map<string, ProxyRouter>()
//     private mux = new StreamMultiplex<ProxyRouter.Event>()
//     get count() {
//         return this.map.size
//     }
//     [Symbol.iterator]() {
//         return this.map.values()
//     }
//     getRouterByConnectionUnchecked(connection_id: string) {
//         return this.map.get(connection_id)
//     }
//     createWith(connection_id: string, upstream: Value.Peer, downstream: Value.Peer) {
//         let pr = ProxyRouter.CreateFromPeers(connection_id, upstream, downstream)
//         this.map.set(connection_id, pr)
//         this.mux.mux(pr)
//         return pr
//     }
//     get(connection_id: string) {
//         let router = this.map.get(connection_id)!
//         return router
//     }
//     [Symbol.asyncIterator]() {
//         return this.mux.listen()
//     }
// }
