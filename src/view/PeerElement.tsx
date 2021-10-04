import React, { useEffect } from 'react'
import { INFO, ERROR } from "../base/stdio"
import { Peer, PeerTargetState, AudioPttState, AudioOutState, AudioMicState } from '../view_model/Peer'
import { Page } from '../view_model/Page'
function play(vid: HTMLVideoElement, s: MediaStream) {
    vid.srcObject = s
    vid.oncanplay = () => {
        vid.setAttribute('autoplay', '')
        vid.setAttribute('playsinline', '')
        vid.play()
        if (vid.videoHeight < vid.videoWidth) {
            let mul = 180 / vid.videoHeight
            vid.height = 180
            vid.width = vid.videoWidth * mul
            vid.style.marginLeft = `${-(vid.width - 180) / 2}px`
        }
        else {
            let mul = 180 / vid.videoWidth
            vid.width = 180
            vid.height = vid.videoHeight * mul
            vid.style.marginTop = `${-(vid.height - 180) / 2}px`
        }
    }
}
export function PeerElement({ id, }: Peer) {
    // For some reason react passes in readonly copies of peer,
    // but we need to mutate peer when mounting the video.
    let peer = Page.current.peers.getUncheckedPeerById(id)!
    let {
        target_state,
        audio_mic_state: audio_broadcast_state,
        audio_ptt_state,
        audio_out_state,
    } = peer
    useEffect(() => {
        let vid = peer.video_ref.current!
        let conn = peer.getBestOpenConnectionOrNull()
        if (!conn) {
            return INFO(['PeerElement', 'useEffect'], `No p2p connection with ${id} yet`)
        }
        if (vid.srcObject) {
            if (peer.incoming_stream) {
                if (vid.srcObject === peer.incoming_stream) {
                    // INFO(['PeerElement', 'useEffect'], 'Keep Playing')
                }
                else {
                    INFO(['PeerElement', 'useEffect'], 'Playing Incoming Stream')
                    play(vid, peer.incoming_stream)
                }
            }
            else {
                ERROR(`THIS IS WEIRD`)
            }
        } else {
            if (peer.incoming_stream) {
                INFO(['PeerElement', 'useEffect'], 'Playing New Incoming Stream')
                play(vid, peer.incoming_stream)
            }
            else {
                INFO(['PeerElement', 'useEffect'], 'No Stream; Try Again')
                setTimeout(() => {
                    Page.render()
                }, 1000)
            }
        }
    })

    let ptt_data = peer.audio_ptt_state === AudioPttState.PttOn ? 'on' : 'off'
    let speaker_data = peer.audio_out_state === AudioOutState.SpeakerOn ? 'on' : 'off'
    let mic_data = peer.audio_mic_state === AudioMicState.MicIsHot ? 'on' : 'off'
    let is_target = peer.target_state === PeerTargetState.IsPttTarget ? 'on' : 'off'

    return <div className="peer-view">
        <div className="peer-view-stack">
            <img className="peer-snapshot" src={peer.image_url} />
        </div>
        <div className="peer-view-stack">
            <div className="peer-video-clip">
                <video className="peer-video" ref={peer.video_ref}></video>
            </div>
        </div>
        <div className="peer-view-stack">
            <div className="peer-status-list">
                <div className="peer-status-item">
                    <div className="peer-ptt-icon" data-ptt={ptt_data} />
                </div>
                <div className="peer-status-item">
                    <div className="peer-speaker-icon" data-speaker={speaker_data} />
                </div>
                <div className="peer-status-item">
                    <div className="peer-mic-icon" data-mic={mic_data} />
                </div>
            </div>
        </div>
        <div className="peer-view-stack"
            onTouchStart={start => {
                start.preventDefault()
                Page.PushToTalkStartPeerById(peer)
                Page.render()
            }}
            onTouchEnd={end => {
                end.preventDefault()
                Page.PushToTalkStopPeerById(peer)
                Page.render()
            }}
        >
            <div className="peer-ptt-activate"
                onMouseDown={down => {
                    down.preventDefault()
                    Page.PushToTalkStartPeerById(peer)
                    Page.render()
                }}
                onMouseUp={up => {
                    up.preventDefault()
                    Page.PushToTalkStopPeerById(peer)
                    Page.render()
                }}
            >
                <a href="#">
                    <span className="peer-ptt-button"></span>
                    Push to Talk
                </a>
            </div>
        </div>
        <div className="peer-view-stack">
            <div className="pulse-root" data-is_target={is_target}>
                <div className="pulse-pulser"></div>
            </div>
        </div>
    </div>
}
