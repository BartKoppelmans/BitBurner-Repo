import * as Utils from '/src/util/Utils.js';
import { CONSTANT } from '/src/lib/constants.js';
const PIXEL_TOLERANCE = 4;
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
    LogType[LogType["BLADEBURNER"] = 6] = "BLADEBURNER";
    LogType[LogType["GANG"] = 7] = "GANG";
    LogType[LogType["SLEEVE"] = 8] = "SLEEVE";
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
    if (!isCorrectLogType(logType)) {
        throw new Error('Incorrect log type');
    }
    printColored(ns, message, logType);
}
function isCorrectLogType(logType) {
    return logType === LogType.NONE || logType === LogType.INFORMATION || logType === LogType.PURCHASED_SERVER || logType === LogType.CODING_CONTRACT || logType === LogType.BLADEBURNER || logType === LogType.GANG;
}
function getColorFromLogType(ns, logType) {
    // TODO: Move the constants to here
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
        case LogType.BLADEBURNER:
            return CONSTANT.COLOR_BLADEBURNER;
        case LogType.GANG:
            return CONSTANT.COLOR_GANG;
        case LogType.SLEEVE:
            return CONSTANT.COLOR_SLEEVE;
        case LogType.NONE:
        default:
            return 'var(--my-font-color)';
    }
}
function shouldScrollIntoView(element) {
    return Math.round(element.scrollHeight - element.scrollTop - element.clientHeight) <= PIXEL_TOLERANCE;
}
function printColored(ns, text, logType) {
    // TODO: Rewrite to use the new function
    const doc = eval('document');
    const terminalInput = doc.getElementById('terminal-input');
    const terminalContainer = doc.getElementById('terminal-container');
    const rowElement = doc.createElement('tr');
    const cellElement = doc.createElement('td');
    let shouldScroll = true;
    if (!terminalInput) {
        throw new Error('Could not find the terminal input.');
    }
    // We have to do this before we add the new element
    if (terminalContainer) {
        shouldScroll = shouldScrollIntoView(terminalContainer);
    }
    text = `${Utils.formatTime()} ${text}`;
    rowElement.classList.add('posted');
    cellElement.classList.add('terminal-line');
    cellElement.style.color = getColorFromLogType(ns, logType);
    cellElement.innerText = text;
    rowElement.appendChild(cellElement);
    terminalInput.before(rowElement);
    if (shouldScroll)
        terminalInput.scrollIntoView(false);
}
