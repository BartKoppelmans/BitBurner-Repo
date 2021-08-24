import { BitBurner as NS } from 'Bitburner'
import GangMember          from '/src/classes/Gang/GangMember.js'

const GANG_MEMBER_NAME_FILE: string = '/src/lib/names.txt' as const

export function createGangMembers(ns: NS): GangMember[] {
	const names: string[] = ns.gang.getMemberNames()
	return names.map((name) => new GangMember(ns, name))
}

export function generateName(ns: NS): string {
	const names: string[] = JSON.parse(ns.read(GANG_MEMBER_NAME_FILE) as string)
	return names[Math.floor(Math.random() * names.length)]
}