import type { BitBurner as NS } from 'Bitburner'
import { GangTaskName }         from '/src/classes/Gang/GangInterfaces.js'
import * as GangUtils           from '/src/util/GangUtils.js'
import GangMember               from '/src/classes/Gang/GangMember.js'

export default class GangTask {

	name: GangTaskName

	public constructor(ns: NS, name: GangTaskName) {
		this.name = name
	}

	public static getTask(ns: NS, taskName: GangTaskName): GangTask {
		return new GangTask(ns, taskName)
	}

	public static getTrainTask(ns: NS): GangTask {
		if (GangUtils.isHackingGang(ns)) return GangTask.getTask(ns, 'Train Hacking')
		else return GangTask.getTask(ns, 'Train Combat')
	}

	public static getRespectTask(ns: NS, member: GangMember): GangTask {

		// TODO: Make this actually calculate what would be best

		if (GangUtils.isHackingGang(ns)) return GangTask.getTask(ns, 'Cyberterrorism')
		else return GangTask.getTask(ns, 'Terrorism')
	}

	public static getWantedLevelReductionTask(ns: NS): GangTask {
		return GangTask.getTask(ns, 'Vigilante Justice')
	}

	public static getMoneyTask(ns: NS): GangTask {
		return GangTask.getTask(ns, 'Traffick Illegal Arms')
	}

	public static getTerritoryWarfareTask(ns: NS): GangTask {
		return GangTask.getTask(ns, 'Territory Warfare')
	}

	public static getUnassignedTask(ns: NS): GangTask {
		return GangTask.getTask(ns, 'Unassigned')
	}
}