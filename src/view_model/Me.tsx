import React from 'react'
import { AudioPttState, AudioOutState, AudioMicState } from './Peer'

export class Me {
    constructor(
        public stream?: MediaStream,
        public outstream?: MediaStream,
        public video_ref = React.createRef<HTMLVideoElement>(),
        public audio_out_state = AudioOutState.SpeakerOn,
        public audio_ptt_state = AudioPttState.PttOn,
        public audio_mic_state = AudioMicState.MicIsHot,
    ) { }
}
