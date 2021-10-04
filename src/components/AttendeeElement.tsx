import React from 'react'
import { Backbone } from "../Backbone"
import { Page } from "../Page"
import { Attendee } from './Attendee'
// import { ProxyRouter } from '../Proxy'
import { ConnectionElement } from "./ConnectionElement"

export function AttendeeElement(attendee: Attendee, order: number) {
    let here_disabled = Page.page.backbone.state !== Backbone.State.Connected
    let there_disabled = attendee.ws_status !== Attendee.WsStatus.Connected
    let disabled = here_disabled || there_disabled

    let connections = Array.from(attendee.connections.values()).map(connection => ConnectionElement(connection, disabled))
    let is_spam = attendee.is_spam ? 'is-spam' : ''
    let status = disabled ?
        <small><span className="badge badge-danger">Disconnected</span></small>
        :
        <small><span className="badge badge-success">Connected</span></small>
    let auto = attendee.auto ? 'Auto' : 'Hold'
    return (<div key={attendee.peer.id} className="col-md-6 col-xl-4">
        <div className={`attendee-list-item ${is_spam}`} style={{ order }}>
            <div className="attendee">
                <div><h2>{attendee.name} {status}</h2></div>
                <div className="btn-group btn-group-toggle">
                    <button disabled={disabled} className="btn btn-outline-primary" onClick={click => {
                        click.preventDefault()
                        attendee.initiateNewP2PConnection()
                    }}>New Connection</button>
                    <button disabled={disabled} className="btn btn-outline-secondary" onClick={click => {
                        click.preventDefault()
                        Page.page.backbone.sendPeer(attendee.peer, new Backbone.BackboneBumpMessage())
                    }}>Bump</button>
                    <button disabled={here_disabled} className="btn btn-outline-danger" onClick={click => {
                        click.preventDefault()
                        attendee.reportSpam()
                        Page.render()
                    }}>Block</button>
                </div>
                <div className="connection-list">
                    <h3>Connections: <button className={`btn btn-sm ${attendee.auto ? 'btn-outline-primary' : 'btn-primary'}`} onClick={click => {
                        attendee.auto = !attendee.auto
                        Page.render()
                    }}>{auto}</button></h3>
                    {connections}
                </div>
            </div>
        </div>
    </div >)
}
