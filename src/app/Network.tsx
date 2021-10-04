import { NetworkMessage, IncomingMessage, NetworkEvent, NetworkDisconnectEvent, NetworkConnectionErrorEvent, NetworkConnectedEvent } from "./NetworkMessage"
export enum NetworkStatus {
    Ready,
    Connected,
    Ended,
    Error
}
export class Network {
    public error?: Error
    public metrics = {
        inbound: 0,
        outbound: 0,
        listeners: 0,
    };
    private ready_done!: () => any
    public ready = new Promise(done => this.ready_done = done);
    constructor(private ws: WebSocket, public status: NetworkStatus = NetworkStatus.Ready) {
        ws.onclose = () => {
            this.status = NetworkStatus.Ended
            if (this.onmessage) {
                this.onmessage(new NetworkDisconnectEvent())
            }
        }
        ws.onerror = e => {
            if (this.onmessage && this.status === NetworkStatus.Ready) {
                this.onmessage(new NetworkConnectionErrorEvent())
            }
            this.status = NetworkStatus.Error
            this.error = new Error(`Network Error`)
            console.error(e)
        }
        ws.onopen = () => {
            this.ready_done()
            this.status = NetworkStatus.Connected
            if (this.onmessage) {
                this.onmessage(new NetworkConnectedEvent())
            }
        }
        ws.onmessage = message => {
            this.metrics.inbound++
            let msg = JSON.parse(message.data) as IncomingMessage
            let dest = this.onmessage
            if (dest) {
                dest(msg)
            }
        }
        let keepalive = () => {
            if (this.status === NetworkStatus.Connected) {
                ws.send(JSON.stringify({}))
            }
            setTimeout(keepalive, 1000)
        }
        setTimeout(keepalive, 1000)
    }
    private onmessage?: (message: NetworkEvent) => void
    send(m: NetworkMessage) {
        this.metrics.outbound++
        if (this.status === NetworkStatus.Connected) {
            this.ws.send(JSON.stringify(m))
        }
    }
    async *listen(): AsyncGenerator<NetworkEvent> {
        if (this.status === NetworkStatus.Ended || this.status === NetworkStatus.Error) {
            throw new Error('Network already ended')
        }
        this.metrics.listeners++
        try {
            while (true) {
                yield Promise.race([
                    // abort,
                    new Promise<NetworkEvent>(done => {
                        this.onmessage = done
                    })
                ])
            }
        }
        finally {
            this.metrics.listeners--
        }
    }
}
