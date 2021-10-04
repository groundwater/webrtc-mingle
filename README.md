# WebRTC Mingle

# Install

1. Fetch the source
    1. `git clone https://github.com/groundwater/webrtc-mingle`
    1. `cd webrtc-mingle`
1. Start the app
    1. `npm install`
    1. `npm start`
1. Test with ngrok
    1. `ngrok http 8080`
    1. Load the _http_ url provided by ngrok *beware this link is globally routable*

# Architecture

- WebRTC is peer-to-peer, but peers need help discovering each other.
- There is a persistent websocket connection between all clients and the server. This connection is used to relay messages between peers in order to help setup webrtc.
- Every peer has its own webrtc connection, so in a room with 10 people there will be 45 connections (10 people with 9 connections per-person, divided by 2).
- There is one websocket connection per user.

# Notes

- https://gist.github.com/sagivo/3a4b2f2c7ac6e1b5267c2f1f59ac6c6b
- https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/

