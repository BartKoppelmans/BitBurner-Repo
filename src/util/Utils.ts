import type { BitBurner as NS } from 'Bitburner'

export function formatTime(date: Date = new Date()): string {
	return `[${date.toLocaleTimeString()}]`
}

export function generateHash(): string {
	return [...Array(32)].map(() => Math.random().toString(36)[2]).join('')
}

export function disableLogging(ns: NS): void {
	ns.disableLog('ALL')
}