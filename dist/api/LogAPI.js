import * as Utils from '/src/util/Utils.js';
import { CONSTANT } from '/src/lib/constants.js';
export function error(ns, message) {
    throw new Error('Not implemented');
    // NOT IMPLEMENTED
}
export var LogType;
(function (LogType) {
    LogType[LogType["NONE"] = 0] = "NONE";
    LogType[LogType["INFORMATION"] = 1] = "INFORMATION";
    LogType[LogType["WARNING"] = 2] = "WARNING";
    LogType[LogType["HACKING"] = 3] = "HACKING";
    LogType[LogType["PURCHASED_SERVER"] = 4] = "PURCHASED_SERVER";
    LogType[LogType["CODING_CONTRACT"] = 5] = "CODING_CONTRACT";
})(LogType || (LogType = {}));
export function debug(ns, message) {
    if (CONSTANT.LOG_DEBUG) {
        printColored(ns, message, LogType.INFORMATION);
    }
}
export function hack(ns, message) {
    if (CONSTANT.LOG_DEBUG_HACKING) {
        printColored(ns, message, LogType.HACKING);
    }
}
export function warn(ns, message) {
    printColored(ns, message, LogType.WARNING);
}
export function log(ns, message, logType) {
    if (logType !== LogType.NONE && logType !== LogType.INFORMATION && logType !== LogType.PURCHASED_SERVER && logType !== LogType.CODING_CONTRACT) {
        throw new Error('Incorrect log type');
    }
    printColored(ns, message, logType);
}
function getColorFromLogType(ns, logType) {
    switch (logType) {
        case LogType.INFORMATION:
            return CONSTANT.COLOR_INFORMATION;
        case LogType.WARNING:
            return CONSTANT.COLOR_WARNING;
        case LogType.HACKING:
            return CONSTANT.COLOR_HACKING;
        case LogType.PURCHASED_SERVER:
            return CONSTANT.COLOR_PURCHASED_SERVER_INFORMATION;
        case LogType.CODING_CONTRACT:
            return CONSTANT.COLOR_CODING_CONTRACT_INFORMATION;
        case LogType.NONE:
        default:
            return 'var(--my-font-color)';
    }
}
function printColored(ns, text, logType) {
    const doc = eval('document');
    const terminalInput = doc.getElementById('terminal-input');
    const rowElement = doc.createElement('tr');
    const cellElement = doc.createElement('td');
    if (!terminalInput) {
        throw new Error('Could not find the terminal input.');
    }
    text = `${Utils.formatTime()} ${text}`;
    rowElement.classList.add('posted');
    cellElement.classList.add('terminal-line');
    cellElement.style.color = getColorFromLogType(ns, logType);
    cellElement.innerText = text;
    rowElement.appendChild(cellElement);
    terminalInput.before(rowElement);
    terminalInput.scrollIntoView(false);
}
