import React, { useEffect } from 'react'
import { CHECK } from '../util/asserts'
import { Page, VideoView } from "../Page"
import { play } from './util/play'

export type HasKey = { key: string }

export function VideoViewElement(vv: VideoView & HasKey) {
    let vid = React.createRef<HTMLVideoElement>()
    useEffect(() => {
        CHECK(vid.current)
        if (vid.current.srcObject)
            return
        if (!vid.current.srcObject) {
            play(vid.current, vv.stream)
        }
    })
    return <div className="video-view-list-item col col-sm-3">
        <div className="video-view" data-peer={Page.page.home.nameFromPeer(vv.peer)}>
            <video ref={vid}></video>
        </div>
    </div>
}
