import { EEventType } from "./EventType"
export namespace Timer {
    export class TimerRunGC {
        type: EEventType.TimerRunGC = EEventType.TimerRunGC;
    }
    export type Timers = TimerRunGC
}
