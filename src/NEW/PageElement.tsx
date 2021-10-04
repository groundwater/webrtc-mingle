import React, { useEffect } from 'react'
import { Backbone } from "./Backbone"
import { MeshPeer } from './MeshPeer'
import { MyStreamElement } from "./MyStreamElement"
import { ConnectionIncomingVideoElement } from "./ConnectionIncomingVideoElement"
import { Page, VideoView } from "./Page"
import { AttendeeElement } from './AttendeeElement'
import { CHECK } from '../base/asserts'
import { play } from './play'
export function ConnectionElement(connection: MeshPeer, disabled: boolean) {
    let outgoing_video
    let audio_icon = connection.outgoing_stream_audio_enabled ? 'icon icon-audio-enabled' : 'icon icon-audio-disabled'
    let video_icon = connection.outgoing_stream_video_enabled ? 'icon icon-video-enabled' : 'icon icon-video-disabled'
    if (connection.outgoing_stream) {
        let audio_button = connection.outgoing_stream_audio_enabled ?
            <button className="btn btn-outline-primary" onClick={click => {
                click.preventDefault()
                connection.enableAudio(false)
                Page.render()
            }}><i className={audio_icon}></i> Audio</button>
            :
            <button className="btn btn-danger" onClick={click => {
                click.preventDefault()
                connection.enableAudio(true)
                Page.render()
            }}><i className={audio_icon}></i> Audio</button>
        let video_button = connection.outgoing_stream_video_enabled ?
            <button className="btn btn-outline-primary" onClick={click => {
                click.preventDefault()
                connection.enableVideo(false)
                Page.render()
            }}><i className={video_icon}></i> Video</button>
            :
            <button className="btn btn-danger" onClick={click => {
                click.preventDefault()
                connection.enableVideo(true)
                Page.render()
            }}><i className={video_icon}></i> Video</button>
        outgoing_video = <li className="list-group-item">
            <div>Sending Stream</div>
            <div className="">
                {audio_button}
                &nbsp;
                {video_button}
            </div>
        </li>
    } else if (Page.page.outgoing_stream) {
        outgoing_video = <li className="list-group-item">
            <button disabled={disabled} className="btn btn-primary" onClick={click => {
                connection.addStream(Page.page.outgoing_stream!)
            }}>Send Video</button>
        </li>
    }
    else {
        outgoing_video = <li className="list-group-item list-group-item-warning">
            Video Not Enabled
            &nbsp;
            <button disabled title="Enable video to send" className="btn btn-sm btn-primary">Add Video</button>
        </li>
    }

    let incoming_video
    if (connection.incoming_stream) {
        incoming_video = <li className="list-group-item">
            {React.createElement(ConnectionIncomingVideoElement, { connection })}
        </li>
    }
    else {
        incoming_video = <li className="list-group-item list-group-item-warning">
            No Incoming Video
        </li>
    }
    let clrbtn = <button className="btn btn-danger" onClick={click => {
        let at = Page.page.home.getAttendeeFromPeerUnchecked(connection.peer)
        if (at) {
            at.connections.delete(connection.connection_id)
        }
        Page.render()
    }}>Clear</button>
    let state, btns = <div className="btn-group btn-group-toggle">
        <button className="btn btn-outline-danger" onClick={click => {
            click.preventDefault()
            connection.stop()
        }}>Disconnect</button>
        <button className="btn btn-outline-secondary" onClick={click => {
            click.preventDefault()
            connection.send(new MeshPeer.SimplePeerPing())
        }}>Ping</button>
    </div>
    switch (connection.state) {
        case MeshPeer.State.Connected: {
            state = <li className="list-group-item list-group-item-success">
                State: Connected
            </li>
            break
        }
        case MeshPeer.State.Ended: {
            state = <li className="list-group-item list-group-item-danger">
                State: Ended
            </li>
            btns = clrbtn
            outgoing_video = null
            incoming_video = null
            break
        }
        case MeshPeer.State.Error: {
            state = <li className="list-group-item list-group-item-danger">
                State: Error
            </li>
            btns = clrbtn
            outgoing_video = null
            incoming_video = null
            break
        }
        case MeshPeer.State.Ready: {
            state = <li className="list-group-item list-group-item">
                State: Ready
            </li>
            break
        }
        case MeshPeer.State.Offered: {
            state = <li className="list-group-item list-group-item-info">
                State: Offered
            </li>
            break
        }
    }
    return (<div key={connection.connection_id} className="connection-list-item">
        <div className="connection">
            <ul className="list-group">
                <li className="list-group-item">ID: {connection.connection_id} {
                    connection.initiator ? '(Init)' : '(Reply)'
                }</li>
                {state}
                <li className="list-group-item">Pings: {connection.pings}</li>
                {outgoing_video}
                {incoming_video}
                <li className="list-group-item">
                    {btns}
                </li>
            </ul>
        </div>
    </div>)
}
export function PageElement(page: Page) {
    let attendees = Array.from(
        page.home.attendees()
    ).map(
        (attendee, i) => AttendeeElement(attendee, i)
    )
    let my_stream = null
    let autoButton = page.auto_video_stream ?
        <button onClick={click => {
            Page.page.auto_video_stream = false
            Page.render()
        }} className="btn btn-outline-primary">Auto</button>
        :
        <button onClick={click => {
            Page.page.auto_video_stream = true
            Page.render()
        }} className="btn btn-primary">Hold</button>
    if (page.outgoing_stream) {
        my_stream = React.createElement(MyStreamElement, { ...page, autoButton })
    }
    else {
        let video_options = []
        let video_options_ref = React.createRef<HTMLSelectElement>()
        for (let { deviceId, kind, label } of page.devices) {
            if (kind === 'videoinput') {
                video_options.push(<option key={deviceId} value={deviceId}>{label}</option>)
            }
        }
        let audio_options = []
        let audio_options_ref = React.createRef<HTMLSelectElement>()
        for (let { deviceId, kind, label } of page.devices) {
            if (kind === 'audioinput') {
                audio_options.push(<option key={deviceId} value={deviceId}>{label}</option>)
            }
        }
        my_stream = <div className="row justify-content-md-center">
            <div className="col-sm-2">
                {autoButton}
            </div>
            <div className="col-sm-8">
                <form onSubmit={async (submit) => {
                    submit.preventDefault()
                    let video_deviceId = video_options_ref.current!.selectedOptions[0].value
                    let audio_deviceId = audio_options_ref.current!.selectedOptions[0].value
                    let stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: video_deviceId }, audio: { deviceId: audio_deviceId } })

                    stream.getVideoTracks().map(t => t.applyConstraints({
                        frameRate: 15,
                        height: 180,
                        aspectRatio: 1,
                    }))

                    stream.getAudioTracks().map(t => t.applyConstraints({
                        // noiseSuppression: true,
                    }))

                    Page.page.outgoing_stream = stream
                    Page.pump.pump(new Page.PageVideoStreamAddedEvent())
                    Page.render()
                }}>
                    <select className="form-control" ref={video_options_ref}>
                        {video_options}
                    </select>
                    <select className="form-control" ref={audio_options_ref}>
                        {audio_options}
                    </select>
                    <input className="form-control btn btn-primary" type="submit" value="Choose Camera/Mic" />
                </form>
            </div>
        </div>
    }
    let { backbone } = page
    let reconnect = page.auto_try_reconnect ?
        <span className="mr-2">
            <button onClick={click => {
                Page.page.auto_try_reconnect = false
                Page.render()
            }} className="btn btn-outline-primary">Auto</button>
        </span>
        :
        <span className="mr-2">
            <button onClick={click => {
                Page.page.auto_try_reconnect = true
                Page.render()
            }} className="btn btn-primary">Hold</button>
        </span>
    let state
    switch (backbone.state) {
        case Backbone.State.Ready: {
            state = <div>Websocket Ready</div>
            break
        }
        case Backbone.State.Connected: {
            state = <div className="ws-status alert alert-success">
                <div className="ws-status-message">Websocket Connected</div>
                <div className="ws-status-btn" >
                    {reconnect}
                    <button className="btn btn-warning btn-sml" onClick={click => {
                        backbone.ws.close()
                    }}>Close</button>
                </div>
            </div>
            break
        }
        case Backbone.State.Error: {
            state = <div className="ws-status alert alert-danger">
                <div className="ws-status-message">Websocket Error</div>
                <div className="ws-status-btn">
                    {reconnect}
                    <button className="btn btn-primary btn-sml" onClick={click => {
                        console.log(Page.page.home)
                        Page.setBackbone(Backbone.CreateWithHome(Page.page.home.name))
                    }}>Connect</button>
                </div>
            </div>
            break
        }
        case Backbone.State.Closed: {
            state = <div className="ws-status alert alert-danger">
                <div className="ws-status-message">Websocket Closed</div>
                <div className="ws-status-btn">
                    {reconnect}
                    <button className="btn btn-primary btn-sml" onClick={click => {
                        Page.setBackbone(Backbone.CreateWithHome(Page.page.home.name))
                        console.log(Page.page.home)
                    }}>Connect</button>
                </div>
            </div>
            break
        }
    }

    let my_video_views = []
    for (let view of Page.get_video_views()) {
        my_video_views.push(<VideoViewElement {...view} key={view.id} />)
    }

    return <div className="container">
        <h1>{page.name}</h1>
        <div className="row">
            <div className="col">{state}</div>
        </div>
        {my_stream}
        <div className="video-view-list row">{my_video_views}</div>
        <div className="attendee-list row">
            {attendees}
        </div>
    </div>
}

export type HasKey = { key: string }

function VideoViewElement(vv: VideoView & HasKey) {
    let vid = React.createRef<HTMLVideoElement>()
    useEffect(() => {
        CHECK(vid.current)
        if (vid.current.srcObject) return
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
