import type { BitBurner as NS, GangMemberInfo } from 'Bitburner'
import GangTask                                 from '/src/classes/Gang/GangTask.js'

export default class GangMember {

	name: string

	public constructor(ns: NS, name: string) {
		this.name = name
	}

	public getStats(ns: NS): GangMemberInfo {
		return ns.gang.getMemberInformation(this.name)
	}

	public startTask(ns: NS, task: GangTask): void {
		ns.gang.setMemberTask(this.name, task.name)
	}
}