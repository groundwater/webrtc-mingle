import { stringify, parse } from 'querystring'
import React from 'react'
import { Page } from '../view_model/Page'
import { startApplication } from "../app/startApplication"

function DeviceOptionElement(device: MediaDeviceInfo) {
    return <option key={device.deviceId} value={device.deviceId}>{device.label}</option>
}
export function DevicesOptionsElements({ devices }: {
    devices: MediaDeviceInfo[]
}) {
    let audio = []
    let video = []
    for (let device of devices) {
        if (device.kind === 'audioinput') {
            audio.push(device)
        }
        else if (device.kind === 'videoinput') {
            video.push(device)
        }
        else {
            console.log(`Disrecard device ${device.label}`)
        }
    }
    let audioRef = React.createRef<HTMLSelectElement>()
    let videoRef = React.createRef<HTMLSelectElement>()
    console.log(parse(location.search.substr(1)))
    return <div className="container full" style={{}}>
        <div className="row full" style={{
            display: 'flex'
        }}>
            <div style={{
                marginTop: 'auto',
                marginBottom: 'auto',
            }} className="col">
                <form style={{
                    padding: '0 5px'
                }} onSubmit={submit => {
                    submit.preventDefault()
                    let audio = audioRef.current!.selectedOptions[0].value
                    let video = videoRef.current!.selectedOptions[0].value
                    let qs = stringify({ video, audio, ...parse(location.search.substr(1)) })
                    let url = new URL(location.href)
                    url.search = qs
                    Page.current.video_device_id = video
                    Page.current.audio_device_id = audio
                    startApplication()
                }}>
                    <div className="form-group">
                        <label>Audio Input</label>
                        <select className="form-control" ref={audioRef}>
                            {audio.map(DeviceOptionElement)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Video Input</label>
                        <select className="form-control" ref={videoRef}>
                            {video.map(DeviceOptionElement)}
                        </select>
                    </div>
                    <div className="form-group">
                        <input type="submit" className="btn btn-primary btn-lg btn-block" value="Join" />
                    </div>
                </form>
            </div>
        </div>
    </div>
}
