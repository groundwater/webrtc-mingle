import React from 'react'
import ReactDOM from 'react-dom'
import { DevicesOptionsElements } from '../view/DeviceOptionElement'
export async function startChooseCamera() {
    await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    let devices = await navigator.mediaDevices.enumerateDevices()
    ReactDOM.render(React.createElement(DevicesOptionsElements, { devices }), document.getElementById('root'))
}
