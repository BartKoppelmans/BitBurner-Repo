import type { BitBurner as NS, GangMemberAscension, GangMemberInfo } from 'Bitburner'
import GangTask                                                      from '/src/classes/Gang/GangTask.js'
import {
	GangAscensionMultipliers,
	GangAscensionPoints,
	GangMemberStats,
	GangTaskName,
}                                                                    from '/src/classes/Gang/GangInterfaces.js'
import GangUpgrade                                                   from '/src/classes/Gang/GangUpgrade.js'
import * as LogAPI                                                   from '/src/api/LogAPI.js'
import { LogType }                                                   from '/src/api/LogAPI.js'


export default class GangMember {

	name: string
	upgrades: GangUpgrade[]

	public constructor(ns: NS, name: string) {
		this.name     = name
		this.upgrades = GangUpgrade.getMemberUpgrades(ns, this.name)
	}

	public getCurrentTask(ns: NS): GangTask {
		const taskName: GangTaskName = this.getGangMemberInformation(ns).task
		return GangTask.getTask(ns, taskName)
	}

	public static getAllGangMembers(ns: NS): GangMember[] {
		const names: string[] = ns.gang.getMemberNames()
		return names.map((name) => new GangMember(ns, name))
	}

	private static calculateAscensionMultiplier(points: number): number {
		return Math.max(Math.pow(points / 4000, 0.7), 1)
	}

	public getGangMemberInformation(ns: NS): GangMemberInfo {
		return ns.gang.getMemberInformation(this.name)
	}

	public getGangMemberStats(ns: NS): GangMemberStats {
		const gangMemberInformation: GangMemberInfo = this.getGangMemberInformation(ns)
		return {
			hack: gangMemberInformation.hack,
			str: gangMemberInformation.str,
			def: gangMemberInformation.def,
			dex: gangMemberInformation.dex,
			agi: gangMemberInformation.agi,
			cha: gangMemberInformation.cha,
		}
	}

	public startTask(ns: NS, task: GangTask): void {
		const currentTask: GangTask = this.getCurrentTask(ns)

		if (currentTask.name !== task.name) {
			ns.gang.setMemberTask(this.name, task.name)
			if (task.name !== 'Unassigned') LogAPI.log(ns, `Gang member '${this.name}' is starting task '${task.name}'`, LogType.GANG)
		}
	}

	public ascend(ns: NS): GangMemberAscension {
		const results: GangMemberAscension = ns.gang.ascendMember(this.name)

		if (!results) LogAPI.warn(ns, `Could not ascend${this.name}`)
		else {
			LogAPI.log(ns, `Ascended ${this.name}`, LogType.GANG)
			this.upgrades = this.upgrades.filter((upgrade) => upgrade.type === 'Augmentation')
		}

		return results
	}

	public purchaseUpgrade(ns: NS, upgrade: GangUpgrade): boolean {
		const isSuccessful: boolean = ns.gang.purchaseEquipment(this.name, upgrade.name)
		if (isSuccessful) this.upgrades.push(upgrade)
		return isSuccessful
	}

	public getCurrentAscensionPoints(ns: NS): GangAscensionPoints {
		const memberInformation: GangMemberInfo = ns.gang.getMemberInformation(this.name)
		return {
			hack: memberInformation.hack_asc_points,
			str: memberInformation.str_asc_points,
			def: memberInformation.def_asc_points,
			dex: memberInformation.dex_asc_points,
			agi: memberInformation.agi_asc_points,
			cha: memberInformation.cha_asc_points,
		}
	}

	public getAscensionResults(ns: NS): GangAscensionMultipliers {
		const currentPoints: GangAscensionPoints = this.getCurrentAscensionPoints(ns)
		const newPoints: GangAscensionPoints     = this.getNewAscensionPoints(ns)
		return {
			hack: GangMember.calculateAscensionMultiplier(currentPoints.hack + newPoints.hack) / GangMember.calculateAscensionMultiplier(currentPoints.hack),
			str: GangMember.calculateAscensionMultiplier(currentPoints.str + newPoints.str) / GangMember.calculateAscensionMultiplier(currentPoints.str),
			def: GangMember.calculateAscensionMultiplier(currentPoints.def + newPoints.def) / GangMember.calculateAscensionMultiplier(currentPoints.def),
			dex: GangMember.calculateAscensionMultiplier(currentPoints.dex + newPoints.dex) / GangMember.calculateAscensionMultiplier(currentPoints.dex),
			agi: GangMember.calculateAscensionMultiplier(currentPoints.agi + newPoints.agi) / GangMember.calculateAscensionMultiplier(currentPoints.agi),
			cha: GangMember.calculateAscensionMultiplier(currentPoints.cha + newPoints.cha) / GangMember.calculateAscensionMultiplier(currentPoints.cha),
		}
	}

	private getNewAscensionPoints(ns: NS): GangAscensionPoints {
		const memberInformation: GangMemberInfo = ns.gang.getMemberInformation(this.name)
		return {
			hack: Math.max(memberInformation.hack_exp - 1000, 0),
			str: Math.max(memberInformation.str_exp - 1000, 0),
			def: Math.max(memberInformation.def_exp - 1000, 0),
			dex: Math.max(memberInformation.dex_exp - 1000, 0),
			agi: Math.max(memberInformation.agi_exp - 1000, 0),
			cha: Math.max(memberInformation.cha_exp - 1000, 0),
		}
	}
}