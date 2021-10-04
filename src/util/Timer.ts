import { EventType } from "../EventType"
export namespace Timer {
    export class TimerRunGC {
        type: EventType.TimerRunGC = EventType.TimerRunGC;
    }
    export type Timers = TimerRunGC
}
