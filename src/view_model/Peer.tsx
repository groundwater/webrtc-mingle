import React from 'react'
import { CollectionLike } from "../base/CollectionLike"
import { Connection, ConnectionState } from '../app/Connection'
import { INFO } from '../base/stdio'
export type PeerID = string
export enum AudioPttState {
    PttOff,
    PttOn,
    // PttActive,
}
export enum AudioMicState {
    MicIsOff,
    MicIsHot,
}
export enum AudioOutState {
    SpeakerOff,
    SpeakerOn,
}
// export enum PeerAudioSourceState {
//     IsNotAudioSource,
//     IsAudioSource,
// }
export enum PeerTargetState {
    IsNotTarget, // Not being clicked by you.
    IsPttTarget, // Clicked by YOU, you are targeting them in PTT
}
export class Peer {
    addStream(stream: MediaStream) {
        INFO(['Peer', 'addStream'], stream)
        this.incoming_stream = stream
    }
    static CreateWithIdAndOutgoingStream(id: string, stream: MediaStream) {
        let peer = new Peer(id, stream)
        return peer
    }
    private constructor(
        public readonly id: string,
        public readonly outgoing_stream: MediaStream,
        public name: string = '',
        public incoming_stream?: MediaStream,
        public connection_pool = new CollectionLike<Connection>(),
        public image_url?: string,
        public video_ref = React.createRef<HTMLVideoElement>(),

        // Icons
        public audio_ptt_state = AudioPttState.PttOn,
        public audio_mic_state = AudioMicState.MicIsHot,
        public audio_out_state = AudioOutState.SpeakerOn,

        // Other Stuff
        // public audio_source_state = PeerAudioSourceState.IsNotAudioSource,
        public target_state = PeerTargetState.IsNotTarget,
    ) { }
    get key() {
        return this.id
    }

    private setEnableIncomingAudio(enabled: boolean) {
        if (this.incoming_stream) {
            for (let audio of this.incoming_stream.getAudioTracks()) {
                audio.enabled = enabled
            }
        }
    }

    private setEnableOutgoingAudio(enabled: boolean) {
        if (this.outgoing_stream) {
            for (let audio of this.outgoing_stream.getAudioTracks()) {
                audio.enabled = enabled
            }
        }
    }

    muteOutgoingAudio() {
        INFO(['Peer', 'muteOutgoingAudio'])
        this.setEnableOutgoingAudio(false)
    }
    unmuteOutgoingAudio() {
        INFO(['Peer', 'unmuteOutgoingAudio'])
        this.setEnableOutgoingAudio(true)
    }

    muteIncomingAudio() {
        INFO(['Peer', 'muteIncomingAudio'])
        this.setEnableIncomingAudio(false)
    }
    unmuteIncomingAudio() {
        INFO(['Peer', 'unmuteIncomingAudio'])
        this.setEnableIncomingAudio(true)
    }

    createNewConnection() {
        let conn = Connection.CreateInitiator()
        return this.connection_pool.set(conn)
    }
    getOrCreateNewFromIdWithOffer(id: string, offer: string) {
        if (!this.connection_pool.hasById(id)) {
            this.connection_pool.set(Connection.CreateResponder(id))
        }
        let conn = this.connection_pool.getCheckedById(id)
        conn.receieveOffer(offer)
        return conn
    }
    getBestOpenConnectionOrNull() {
        for (let conn of this.connection_pool) {
            if (conn.state === ConnectionState.Connected) {
                return conn
            }
            else if (conn.state === ConnectionState.Ended
                || conn.state === ConnectionState.Error) {
                this.connection_pool.deleteById(conn.id)
            }
        }
        return null
    }
    clearAllConnections() {
        for (let conn of this.connection_pool) {
            conn.disconnect()
            this.connection_pool.deleteById(conn.id)
        }
    }
    clearConnectionById(id: string) {
        let conn = this.connection_pool.getCheckedById(id)
        conn.disconnect()
        this.connection_pool.deleteById(conn.id)
    }
}
