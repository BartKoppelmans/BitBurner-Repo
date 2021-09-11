import { CONSTANT } from '/src/lib/constants.js';
import * as Utils from '/src/util/Utils.js';
export var LogType;
(function (LogType) {
    LogType[LogType["DEBUG"] = 0] = "DEBUG";
    LogType[LogType["WARN"] = 1] = "WARN";
    LogType[LogType["INFORMATION"] = 2] = "INFORMATION";
})(LogType || (LogType = {}));
export function debug(ns, message) {
    if (CONSTANT.LOG_DEBUG) {
        terminalPrint(ns, message, LogType.DEBUG);
    }
}
export function warn(ns, message) {
    terminalPrint(ns, message, LogType.WARN);
}
export function log(ns, message) {
    terminalPrint(ns, message, LogType.INFORMATION);
}
function terminalPrint(ns, message, logType) {
    const time = Utils.formatTime();
    switch (logType) {
        case LogType.INFORMATION:
            message = `${time} INFO:  ${message}`;
            break;
        case LogType.DEBUG:
            message = `${time} DEBUG: ${message}`;
            break;
        case LogType.WARN:
            message = `${time} WARN:  ${message}`;
            break;
        default:
            break;
    }
    ns.tprintf(message);
}
