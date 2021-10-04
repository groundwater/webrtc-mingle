import React, { useEffect } from 'react'
import { Page } from '../Page'
import { fit180, play } from "./util/play"
export function MyStreamElement(page: Page & { autoButton: any }) {
    let videoref = React.createRef<HTMLVideoElement>()
    useEffect(() => {
        let vid = videoref.current!
        if (!vid.srcObject) {
            let myvideo = page.outgoing_stream!.clone()
            for (let track of myvideo.getAudioTracks()) {
                track.enabled = false
            }
            play(vid, myvideo)
        }
        fit180(videoref.current!)
    })
    let audio = page.outgoing_stream!.getAudioTracks()
    let video = page.outgoing_stream!.getVideoTracks()
    let log = []
    for (let a of audio) {
        log.push(<div key="audio">Audio: {a.label}</div>)
    }
    for (let v of video) {
        let s = v.getSettings()
        log.push(<div key="video">Video: {v.label}</div>)
        log.push(<div key="fps">fps: {s.frameRate}</div>)
        log.push(<div key="width">width: {s.width}</div>)
        log.push(<div key="height">height: {s.height}</div>)
    }

    let autoButton = page.autoButton
    return <div className="my-video">
        <div className="my-video-controls">
            {autoButton}
        </div>
        <div className="video-frame my-video-frame">
            <video key="video" ref={videoref}></video>
        </div>
        <div className="my-video-status">{log}</div>
    </div>
}
