import React, { useEffect } from 'react'
import { MeshPeer, MeshPeerStreamHealth } from '../MeshPeer'
import { Page } from '../Page'
import { fit180, play } from "./util/play"

export const stream_health_colors = {
    [MeshPeerStreamHealth.Unknown]: `#aaaaaa`,
    [MeshPeerStreamHealth.Best]: `#00ff00`,
    [MeshPeerStreamHealth.Good]: `#aaff00`,
    [MeshPeerStreamHealth.Okay]: `#aaaa00`,
    [MeshPeerStreamHealth.Worse]: `#ffaa00`,
    [MeshPeerStreamHealth.Failed]: `#ff0000`,
}
export const stream_health_maximums = {
    Best: 0.125,
    Good: 1.5,
    Okay: 3,
    Worse: 5,
}
export function ConnectionIncomingVideoElement({ connection }: { connection: MeshPeer }) {
    let videoref = React.createRef<HTMLVideoElement>()
    useEffect(() => {
        let { incoming_stream } = connection
        incoming_stream = incoming_stream!

        let vid = videoref.current!
        if (!vid.srcObject) {
            play(vid, incoming_stream)

            let startOffset = Date.now()
            function checkDelay() {
                let delta = (Date.now() - startOffset) / 1000 - vid.currentTime
                if (connection.state === MeshPeer.State.Connected) {
                    if (delta <= stream_health_maximums.Best && connection.stream_health != MeshPeerStreamHealth.Best) {
                        Page.pump.pump(new Page.VideoStreamHealthChangeEvent(connection.connection_id, connection.peer, MeshPeerStreamHealth.Best))
                    } else if (delta < stream_health_maximums.Good && connection.stream_health != MeshPeerStreamHealth.Good) {
                        Page.pump.pump(new Page.VideoStreamHealthChangeEvent(connection.connection_id, connection.peer, MeshPeerStreamHealth.Good))
                    } else if (delta < stream_health_maximums.Okay && connection.stream_health != MeshPeerStreamHealth.Okay) {
                        Page.pump.pump(new Page.VideoStreamHealthChangeEvent(connection.connection_id, connection.peer, MeshPeerStreamHealth.Okay))
                    } else if (delta < stream_health_maximums.Worse && connection.stream_health != MeshPeerStreamHealth.Worse) {
                        Page.pump.pump(new Page.VideoStreamHealthChangeEvent(connection.connection_id, connection.peer, MeshPeerStreamHealth.Worse))
                    } else if (connection.stream_health != MeshPeerStreamHealth.Failed) {
                        Page.pump.pump(new Page.VideoStreamHealthChangeEvent(connection.connection_id, connection.peer, MeshPeerStreamHealth.Failed))
                    }
                    setTimeout(checkDelay, Math.random() * 2000)
                } else if (connection.stream_health != MeshPeerStreamHealth.Failed) {
                    Page.pump.pump(new Page.VideoStreamHealthChangeEvent(connection.connection_id, connection.peer, MeshPeerStreamHealth.Failed))
                }
            }
        }
        fit180(videoref.current!)
    })

    return <div>
        <div className="video-frame" style={{
            border: `5px solid ${stream_health_colors[connection.stream_health]}`,
            transition: `border-color 1s ease`,
        }}>
            <video key="video" ref={videoref}></video>
        </div>
    </div>
}
