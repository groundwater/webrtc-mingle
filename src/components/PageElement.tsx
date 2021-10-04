import React from 'react'
import { Backbone } from "../Backbone"
import { Page } from "../Page"
import { AttendeeElement } from './AttendeeElement'
import { MyStreamElement } from "./MyStreamElement"
import { VideoViewElement } from './VideoViewElement'

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
                    }))

                    Page.page.outgoing_stream = stream
                    Page.pump.appendToStream(new Page.PageVideoStreamAddedEvent())
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


