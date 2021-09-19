import * as Utils from '/src/util/Utils.js';
import { CONSTANT } from '/src/lib/constants.js';
const PIXEL_TOLERANCE = 4;
export var LogType;
(function (LogType) {
    LogType[LogType["NONE"] = 0] = "NONE";
    LogType[LogType["INFORMATION"] = 1] = "INFORMATION";
    LogType[LogType["WARNING"] = 2] = "WARNING";
    LogType[LogType["HACKING"] = 3] = "HACKING";
    LogType[LogType["PURCHASED_SERVER"] = 4] = "PURCHASED_SERVER";
    LogType[LogType["CODING_CONTRACT"] = 5] = "CODING_CONTRACT";
    LogType[LogType["BLADEBURNER"] = 6] = "BLADEBURNER";
    LogType[LogType["GANG"] = 7] = "GANG";
    LogType[LogType["SLEEVE"] = 8] = "SLEEVE";
    LogType[LogType["STOCK"] = 9] = "STOCK";
})(LogType || (LogType = {}));
export function debug(ns, message) {
    if (CONSTANT.LOG_DEBUG) {
        printColored(ns, message, LogType.INFORMATION);
    }
}
export function warn(ns, message) {
    printColored(ns, message, LogType.WARNING);
}
export function log(ns, message, logType = LogType.INFORMATION) {
    printColored(ns, message, logType);
}
export function logHTML(ns, content) {
    printHTML(ns, content);
}
function getColorFromLogType(ns, logType) {
    switch (logType) {
        case LogType.WARNING:
            return 'red';
        case LogType.HACKING:
            return 'white';
        case LogType.PURCHASED_SERVER:
            return 'green';
        case LogType.CODING_CONTRACT:
            return 'yellow';
        case LogType.BLADEBURNER:
            return 'pink';
        case LogType.GANG:
            return 'purple';
        case LogType.SLEEVE:
            return 'aquamarine';
        case LogType.STOCK:
            return 'SpringGreen';
        case LogType.NONE:
        case LogType.INFORMATION:
        default:
            return 'var(--my-font-color)';
    }
}
function printHTML(ns, content) {
    const doc = eval('document');
    const terminalContainer = doc.getElementById('generic-react-container');
    if (!terminalContainer)
        throw new Error('Could not find the terminal container');
    const terminalLines = terminalContainer.querySelector('ul');
    if (!terminalLines)
        throw new Error('Could not find the terminal lines');
    terminalLines.insertAdjacentHTML('beforeend', `<li>${content}</li>`);
}
function printColored(ns, content, logType) {
    const color = getColorFromLogType(ns, logType);
    ns.tprintf(`${Utils.formatTime()} ${content}`);
}
