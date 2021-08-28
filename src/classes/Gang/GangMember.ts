import type { BitBurner as NS, GangMemberAscension, GangMemberInfo } from 'Bitburner'
import GangTask                                                      from '/src/classes/Gang/GangTask.js'
import { GangAscensionMultipliers, GangAscensionPoints }             from '/src/classes/Gang/GangInterfaces.js'
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

	public getStats(ns: NS): GangMemberInfo {
		return ns.gang.getMemberInformation(this.name)
	}

	public startTask(ns: NS, task: GangTask): void {
		ns.gang.setMemberTask(this.name, task.name)
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

	public purchaseUpgrade(ns: NS, upgrade: GangUpgrade) {
		const isSuccessful: boolean = ns.gang.purchaseEquipment(this.name, upgrade.name)

		if (!isSuccessful) LogAPI.warn(ns, `Could not successfully purchase ${upgrade.name}`)
		else {
			this.upgrades.push(upgrade)

			LogAPI.log(ns, `Purchased ${upgrade.name} for ${this.name}`, LogType.GANG)
		}
	}

	private getAscensionPoints(ns: NS): GangAscensionPoints {
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

	private static calculateAscensionMultiplier(points: number): number {
		return Math.max(Math.pow(points / 4000, 0.7), 1)
	}

	public getAscensionResults(ns: NS): GangAscensionMultipliers {
		const currentPoints: GangAscensionPoints = this.getAscensionPoints(ns)
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

	public static getAllGangMembers(ns: NS): GangMember[] {
		const names: string[] = ns.gang.getMemberNames()
		return names.map((name) => new GangMember(ns, name))
	}
}