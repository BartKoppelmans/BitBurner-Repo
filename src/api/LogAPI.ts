import type { BitBurner as NS } from 'Bitburner'
import { CONSTANT }             from '/src/lib/constants.js'
import * as Utils               from '/src/util/Utils.js'

export enum LogType {
	DEBUG,
	WARN,
	INFORMATION
}

export function debug(ns: NS, message: string): void {
	if (CONSTANT.LOG_DEBUG) {
		terminalPrint(ns, message, LogType.DEBUG)
	}
}

export function warn(ns: NS, message: string): void {
	terminalPrint(ns, message, LogType.WARN)
}

export function log(ns: NS, message: string): void {
	terminalPrint(ns, message, LogType.INFORMATION)
}

function terminalPrint(ns: NS, message: string, logType: LogType): void {

	const time: string = Utils.formatTime()

	switch (logType) {
		case LogType.INFORMATION:
			message = `${time} INFO:  ${message}`
			break
		case LogType.DEBUG:
			message = `${time} DEBUG: ${message}`
			break
		case LogType.WARN:
			message = `${time} WARN:  ${message}`
			break
		default:
			break
	}

	ns.tprintf(message)
}