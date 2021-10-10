import * as Utils from '/src/util/Utils.js';
export function printLog(ns, message) {
    ns.print(`${Utils.formatTime()} ${message}`);
}
export function printTerminal(ns, message) {
    ns.tprintf(`${Utils.formatTime()} ${message}`);
}
