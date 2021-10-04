import { ConnectionOffer } from "./ConnectionOffer"
import { AudioPttState, AudioMicState, AudioOutState } from "../view_model/Peer"
export class HelloMessage {
    type: 'hello' = 'hello';
    constructor(
        public init: boolean,
        public name: string,
        public room: string,
        public ptt: AudioPttState,
        public mic: AudioMicState,
        public out: AudioOutState,
    ) { }
}
export class GoodbyeMessage {
    type: 'goodbye' = 'goodbye'
}
export class InfoMessage {
    type: 'info' = 'info'
    constructor(
        public message: string
    ) { }
}
export class OfferMessage {
    type: 'offer' = 'offer';
    constructor(
        public connection_id: string,
        public offer: ConnectionOffer
    ) { }
}
export class UpdateAvatarMessage {
    type: 'UpdateAvatarMessage' = 'UpdateAvatarMessage'
    constructor(
        public url: string,
        public room: string,
    ) { }
}
export class PushToTalkMessage {
    type: 'PushToTalkMessage' = 'PushToTalkMessage'
    constructor(
        public enable: boolean
    ) { }
}
export enum StatusUpdate {
    MicOff,
    MicOn,
    PttOff,
    PttOn,
    SpeakerOff,
    SpeakerOn,
}
export class StatusUpdateMessage {
    type: 'StatusMessage' = 'StatusMessage'
    constructor(
        public status: StatusUpdate
    ) { }
}
export type Message =
    | HelloMessage
    | GoodbyeMessage
    | OfferMessage
    | InfoMessage
    | UpdateAvatarMessage
    | PushToTalkMessage
    | StatusUpdateMessage

export class PeerToPeerMessage {
    type: 'peer' = 'peer'
    constructor(public dest_id: string, public message: Message) { }
}
export class RoomBroadcastMessage {
    type: 'room' = 'room'
    constructor(public message: Message) { }
}
export class HomeBroadcastMessage {
    type: 'HomeBroadcastMessage' = 'HomeBroadcastMessage'
    constructor(public message: Message) { }
}
export type NetworkMessage =
    | PeerToPeerMessage
    | RoomBroadcastMessage
    | HomeBroadcastMessage

export class IncomingMessage {
    type: 'IncomingMessage' = 'IncomingMessage'
    constructor(public from_id: string, public message: Message) { }
}
export class NetworkDisconnectEvent {
    type: 'NetworkDisconnectEvent' = 'NetworkDisconnectEvent'
    constructor() { }
}
export class NetworkConnectionErrorEvent {
    type: 'NetworkConnectionErrorEvent' = 'NetworkConnectionErrorEvent'
    constructor() { }
}
export class NetworkConnectedEvent {
    type: 'NetworkConnectedEvent' = 'NetworkConnectedEvent'
    constructor() { }
}
export type NetworkEvent =
    | IncomingMessage
    | NetworkDisconnectEvent
    | NetworkConnectionErrorEvent
    | NetworkConnectedEvent
