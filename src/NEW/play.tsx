export function play(vid: HTMLVideoElement, s: MediaStream) {
    vid.srcObject = s
    vid.oncanplay = () => {
        vid.setAttribute('autoplay', '')
        vid.setAttribute('playsinline', '')
        fit180(vid)
        try {
            vid.play()
        } catch (e) {
            console.error(e)
            vid.muted = true
            vid.play()
        }
    }
}
export function fit180(vid: HTMLVideoElement) {
    if (vid.videoHeight < vid.videoWidth) {
        let mul = 180 / vid.videoHeight
        vid.height = 180
        vid.width = vid.videoWidth * mul
        vid.style.marginLeft = `${-(vid.width - 180) / 2}px`
        vid.style.marginTop = `0`
    }
    else {
        let mul = 180 / vid.videoWidth
        vid.width = 180
        vid.height = vid.videoHeight * mul
        vid.style.marginTop = `${-(vid.height - 180) / 2}px`
        vid.style.marginLeft = `0`
    }
}
