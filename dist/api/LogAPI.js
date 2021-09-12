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
function shouldScrollIntoView(element) {
    return Math.round(element.scrollHeight - element.scrollTop - element.clientHeight) <= PIXEL_TOLERANCE;
}
function printColored(ns, content, logType) {
    const color = getColorFromLogType(ns, logType);
    const doc = eval('document');
    const terminalInput = doc.getElementById('terminal-input');
    const terminalContainer = doc.getElementById('terminal-container');
    let shouldScroll = true;
    if (!terminalInput) {
        throw new Error('Could not find the terminal input.');
    }
    // We have to do this before we add the new element
    if (terminalContainer) {
        shouldScroll = shouldScrollIntoView(terminalContainer);
    }
    content = `<span style="color: ${color}">${Utils.formatTime()} ${content}</span>`;
    ns.tprintf(content);
    if (shouldScroll)
        terminalInput.scrollIntoView(false);
}
