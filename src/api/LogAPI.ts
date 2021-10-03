import type { BitBurner as NS } from 'Bitburner'
import * as Utils               from '/src/util/Utils.js'
import { CONSTANT }             from '/src/lib/constants.js'

export enum LogType {
	NONE,
	INFORMATION,
	WARNING,
	HACKING,
	PURCHASED_SERVER,
	CODING_CONTRACT,
	BLADEBURNER,
	GANG,
	SLEEVE,
	STOCK
}

export function debug(ns: NS, message: string): void {
	if (CONSTANT.LOG_DEBUG) {
		printColored(ns, message, LogType.INFORMATION)
	}
}

export function warn(ns: NS, message: string): void {
	printColored(ns, message, LogType.WARNING)
}

export function log(ns: NS, message: string, logType: LogType = LogType.INFORMATION): void {
	printColored(ns, message, logType)
}

function getColorFromLogType(ns: NS, logType: LogType): string {
	switch (logType) {
		case LogType.WARNING:
			return 'red'
		case LogType.HACKING:
			return 'white'
		case LogType.PURCHASED_SERVER:
			return 'green'
		case LogType.CODING_CONTRACT:
			return 'yellow'
		case LogType.BLADEBURNER:
			return 'pink'
		case LogType.GANG:
			return 'purple'
		case LogType.SLEEVE:
			return 'aquamarine'
		case LogType.STOCK:
			return 'SpringGreen'
		case LogType.NONE:
		case LogType.INFORMATION:
		default:
			return 'var(--my-font-color)'
	}
}

function printColored(ns: NS, content: string, logType: LogType): void {
	ns.tprintf(`${Utils.formatTime()} ${content}`)
}