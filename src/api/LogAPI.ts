import type { NS } from 'Bitburner'
import * as Utils  from '/src/util/Utils.js'

export function printLog(ns: NS, message: string): void {
	ns.print(`${Utils.formatTime()} ${message}`)
}

export function printTerminal(ns: NS, message: string): void {
	ns.tprintf(`${Utils.formatTime()} ${message}`)
}