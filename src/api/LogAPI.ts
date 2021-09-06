import type { BitBurner as NS } from 'Bitburner'
import * as Utils               from '/src/util/Utils.js'
import { CONSTANT }             from '/src/lib/constants.js'

const PIXEL_TOLERANCE: number = 4 as const

export function error(ns: NS, message: string): void {
	throw new Error('Not implemented')
	// NOT IMPLEMENTED
}

export enum LogType {
	NONE,
	INFORMATION,
	WARNING,
	HACKING,
	PURCHASED_SERVER,
	CODING_CONTRACT,
	BLADEBURNER,
	GANG,
	SLEEVE
}

export function debug(ns: NS, message: string): void {
	if (CONSTANT.LOG_DEBUG) {
		printColored(ns, message, LogType.INFORMATION)
	}
}

export function hack(ns: NS, message: string): void {
	if (CONSTANT.LOG_DEBUG_HACKING) {
		printColored(ns, message, LogType.HACKING)
	}
}

export function warn(ns: NS, message: string): void {
	printColored(ns, message, LogType.WARNING)
}

export function log(ns: NS, message: string, logType: LogType): void {

	if (!isCorrectLogType(logType)) {
		throw new Error('Incorrect log type')
	}

	printColored(ns, message, logType)
}

function isCorrectLogType(logType: LogType): boolean {
	return logType === LogType.NONE || logType === LogType.INFORMATION || logType === LogType.PURCHASED_SERVER || logType === LogType.CODING_CONTRACT || logType === LogType.BLADEBURNER || logType === LogType.GANG
}

function getColorFromLogType(ns: NS, logType: LogType): string {

	// TODO: Move the constants to here

	switch (logType) {
		case LogType.INFORMATION:
			return CONSTANT.COLOR_INFORMATION
		case LogType.WARNING:
			return CONSTANT.COLOR_WARNING
		case LogType.HACKING:
			return CONSTANT.COLOR_HACKING
		case LogType.PURCHASED_SERVER:
			return CONSTANT.COLOR_PURCHASED_SERVER_INFORMATION
		case LogType.CODING_CONTRACT:
			return CONSTANT.COLOR_CODING_CONTRACT_INFORMATION
		case LogType.BLADEBURNER:
			return CONSTANT.COLOR_BLADEBURNER
		case LogType.GANG:
			return CONSTANT.COLOR_GANG
		case LogType.SLEEVE:
			return CONSTANT.COLOR_SLEEVE
		case LogType.NONE:
		default:
			return 'var(--my-font-color)'
	}
}

function shouldScrollIntoView(element: HTMLElement): boolean {
	return Math.round(element.scrollHeight - element.scrollTop - element.clientHeight) <= PIXEL_TOLERANCE
}

function printColored(ns: NS, text: string, logType: LogType) {

	// TODO: Rewrite to use the new function

	const doc: Document                         = eval('document')
	const terminalInput: HTMLElement | null     = doc.getElementById('terminal-input')
	const terminalContainer: HTMLElement | null = doc.getElementById('terminal-container')
	const rowElement: HTMLTableRowElement       = doc.createElement('tr')
	const cellElement: HTMLTableDataCellElement = doc.createElement('td')
	let shouldScroll: boolean                   = true

	if (!terminalInput) {
		throw new Error('Could not find the terminal input.')
	}

	// We have to do this before we add the new element
	if (terminalContainer) {
		shouldScroll = shouldScrollIntoView(terminalContainer)
	}

	text = `${Utils.formatTime()} ${text}`

	rowElement.classList.add('posted')
	cellElement.classList.add('terminal-line')
	cellElement.style.color = getColorFromLogType(ns, logType)
	cellElement.innerText   = text

	rowElement.appendChild(cellElement)
	terminalInput.before(rowElement)

	if (shouldScroll) terminalInput.scrollIntoView(false)
}