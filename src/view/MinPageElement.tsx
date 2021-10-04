import React from 'react'
import { INFO } from "../base/stdio"
import { Page } from '../view_model/Page'
import { PeerElement } from './PeerElement'
import { MeElement } from './MeElement'
import { RoomElement } from './RoomElement'
export function MinPageElement(page: Page) {
    let out = []
    for (let peer of page.peers) {
        if (!peer.incoming_stream) {
            INFO(['PageElement', 'page.peers'], 'No Incoming Stream')
            continue
        }
        out.push(React.createElement(PeerElement, peer))
    }
    return <div className="full">
        <div className="minpage">
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
}
