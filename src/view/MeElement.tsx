import React, { useEffect } from 'react'
import { INFO, ERROR, ENTER, EXIT } from "../base/stdio"
import { Page } from '../view_model/Page'
export function MeElement({ me }: Page) {
    // For some reason react passes in readonly copies of peer,
    // but we need to mutate peer when mounting the video.
    let ref = me.video_ref
    useEffect(() => {
        ENTER(useEffect)
        let vid = ref.current!
        function play(s: MediaStream) {
            vid.srcObject = s
            vid.oncanplay = () => {
                vid.setAttribute('autoplay', '')
                vid.setAttribute('muted', '')
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
        if (vid.srcObject) {
            if (me.stream) {
                if (vid.srcObject === me.stream) {
                }
                else {
                    play(me.stream)
                }
            }
            else {
                ERROR(`THIS IS WEIRD`)
            }
        }
        else {
            if (me.stream) {
                play(me.stream)
            }
            else {
            }
        }
        EXIT(useEffect)
    })
    return <div className="peer-view" onClick={() => {
        Page.WindowRestoreRegularSize()
        Page.render()
    }}>
        <video ref={ref}></video>
    </div>
}
