// the purpose of hack-target is to wait until an appointed time and then execute a hack.
import type { NS } from 'Bitburner'

export async function main(ns: NS) {

	const flags = ns.flags([
		['target', ''],
		['start', Date.now()],
	])

	const target: string = flags.target
	const start: number  = flags.start

	const wait: number = start - Date.now()

	await ns.asleep(wait)
	await ns.weaken(target)

}