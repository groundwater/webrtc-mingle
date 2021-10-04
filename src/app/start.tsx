import { startApplication } from './startApplication'
import { Page } from '../view_model/Page'

let url = new URL(location.href)
let paths = url.pathname.split('/')
let [_, _go, home, room] = paths

Page.current = new Page(home, room)

if (url.protocol !== 'https:' && url.hostname !== 'localhost') {
    url.protocol = 'https:'
    location.href = url.toString()
} else {
    startApplication()
}
