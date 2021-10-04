import React from 'react'
import { Page } from '../view_model/Page'
import { Room } from '../view_model/Room'
import { ERROR } from '../base/stdio'
export function RoomElement(room: Room) {
    let peers = []
    for (let { id: peer_id } of room.peer_ids) {
        let peer = Page.current.peers.getUncheckedPeerById(peer_id)

        if (!peer) {
            ERROR(`Cannot find peer ${peer_id}`)
            continue
        }

        let image = peer.image_url || '/icons/svg/avatar.svg'
        peers.push(<div key={peer.id} style={{
            width: '150px',
            height: '150px',
            marginLeft: '5px',
            boxSizing: 'border-box',
        }}>
            <div style={{
                borderRadius: '10px',
                overflow: 'hidden',
                border: '1px solid #aaa',
            }}>
                <img key={peer_id} src={image} width={150} height={150} />
            </div>
        </div>)
    }
    return <div>
        <div>
            <h2 className="room-title">{room.name}</h2>
            <div className="room-attendee-list">
                {peers}
                <div style={{
                    minWidth: `150px`,
                    minHeight: `150px`,
                    display: 'flex',
                    border: '3px dashed #aaa',
                    borderRadius: '10px',
                    marginLeft: '5px',
                }}>
                    <a href={`/go/${room.home}/${room.name}${location.search}`} style={{
                        height: '100px',
                        width: '100px',
                        margin: 'auto',
                        textAlign: 'center',
                    }}>
                        <img src="/icons/svg/001-plus.svg" alt="join" style={{
                            width: '70px',
                            height: '70px',
                        }} />
                        <div>Join</div>
                    </a>
                </div>
            </div>
        </div>
    </div>
}
