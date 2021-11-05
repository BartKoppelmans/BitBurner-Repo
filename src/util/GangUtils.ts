import { NS } from 'Bitburner'

const GANG_MEMBER_NAME_FILE: string = '/src/lib/names.txt' as const

export function generateName(ns: NS): string {
	const names: string[] = JSON.parse(ns.read(GANG_MEMBER_NAME_FILE) as string)
	return names[Math.floor(Math.random() * names.length)]
}

export function isHackingGang(ns: NS): boolean {
	return ns.gang.getGangInformation().isHacking
}