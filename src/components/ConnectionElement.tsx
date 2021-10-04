import React from 'react'
import { ConnectionIncomingVideoElement } from "./ConnectionIncomingVideoElement"
import { MeshPeer } from '../MeshPeer'
import { Page } from "../Page"

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
                <li className="list-group-item">ID: {connection.connection_id} {connection.initiator ? '(Init)' : '(Reply)'}</li>
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
