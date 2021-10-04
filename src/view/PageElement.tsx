import React from 'react'
import { INFO } from "../base/stdio"
import { Page } from '../view_model/Page'
import { PeerElement } from './PeerElement'
import { MeElement } from './MeElement'
import { RoomElement } from './RoomElement'
export function PageElement(page: Page) {
    let out = []
    for (let peer of page.peers) {
        if (!peer.incoming_stream) {
            INFO(['PageElement', 'page.peers'], 'No Incoming Stream')
            continue
        }
        out.push(React.createElement(PeerElement, peer))
    }
    let rooms = []
    for (let room of Array.from(page.rooms.col).sort((l, r) => r.peer_ids.length - l.peer_ids.length)) {
        if (room.name === page.room && page.home === room.home) {
            continue
        }
        rooms.push(React.createElement(RoomElement, room))
    }
    return <div className="full main-viewport">
        <div className="main-scroll">
            <div>
                <div>
                    <h1 className="my-room">My Room</h1>
                    <h2 className="room-title">{page.room}</h2>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                    }}>
                        <div style={{
                            display: 'aboslute',
                            width: '0',
                            height: '0',
                            overflow: 'hidden',
                        }}>
                            <canvas ref={page.canvas_ref}></canvas>
                        </div>
                        <MeElement {...page} />
                        {out}
                    </div>
                </div>
            </div>
            <div style={{
                marginTop: '50px',
            }}>
                <div>
                    <h1 className="other-rooms">Other Rooms</h1>
                </div>
            </div>
            {rooms}
        </div>
        <div className="fixed-controls">
            <div className="fixed-controls-list">
                <div className="fixed-control-list-item">
                    <div onClick={click => {
                        INFO(['PageElement', 'Broadcast'], click)
                        Page.ToggleMic()
                        Page.render()
                    }}
                        className="fixed-control"
                        data-state={Page.MicState()}>
                    </div>
                </div>
                <div className="fixed-control-list-item">
                    <div onClick={click => {
                        INFO(['PageElement', 'Mute'], click)
                        Page.ToggleSpeaker()
                        Page.render()
                    }}
                        className="fixed-control"
                        data-state={Page.SpeakerState()}>
                    </div>
                </div>
                <div className="fixed-control-list-item">
                    <div onClick={click => {
                        INFO(['PageElement', 'PTT'], click)
                        Page.TogglePTT()
                        Page.render()
                    }}
                        className="fixed-control"
                        data-state={Page.PttState()}>
                    </div>
                </div>
            </div>
        </div>
    </div>
}
