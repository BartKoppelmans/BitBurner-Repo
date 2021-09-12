import type { BitBurner as NS, GangGenInfo, GangTasksStats } from 'Bitburner'
import { GangMemberStats, GangTaskGain, GangTaskName }       from '/src/classes/Gang/GangInterfaces.js'
import * as GangUtils                                        from '/src/util/GangUtils.js'
import GangMember                                            from '/src/classes/Gang/GangMember.js'
import HomeGang                                              from '/src/classes/Gang/HomeGang.js'

export default class GangTask {

	name: GangTaskName

	public constructor(ns: NS, name: GangTaskName) {
		this.name = name
	}

	public static getTask(ns: NS, taskName: GangTaskName): GangTask {
		return new GangTask(ns, taskName)
	}

	public static getAllTasks(ns: NS): GangTask[] {
		const taskNames: GangTaskName[] = ns.gang.getTaskNames()
		return taskNames.map((name) => new GangTask(ns, name))
	}

	public static getTrainTask(ns: NS): GangTask {
		if (GangUtils.isHackingGang(ns)) return GangTask.getTask(ns, 'Train Hacking')
		else return GangTask.getTask(ns, 'Train Combat')
	}

	public static getRespectTask(ns: NS, member: GangMember): GangTask {
		let optimalGain: GangTaskGain = { task: this.getUnassignedTask(ns), gain: 0 }
		for (const task of this.getAllTasks(ns)) {
			const gain: number = this.calculateRespectGain(ns, task, member)
			if (gain > optimalGain.gain) optimalGain = { task, gain }
		}
		return optimalGain.task
	}

	public static getWantedLevelReductionTask(ns: NS, member: GangMember): GangTask {
		let optimalGain: GangTaskGain = { task: this.getUnassignedTask(ns), gain: 0 }
		for (const task of this.getAllTasks(ns)) {
			const gain: number = this.calculateWantedLevelGain(ns, task, member)
			if (gain < optimalGain.gain) optimalGain = { task, gain }
		}
		return optimalGain.task
	}

	public static getMoneyTask(ns: NS, member: GangMember): GangTask {
		let optimalGain: GangTaskGain = { task: this.getUnassignedTask(ns), gain: 0 }
		for (const task of this.getAllTasks(ns)) {
			const gain: number = this.calculateMoneyGain(ns, task, member)
			if (gain > optimalGain.gain) optimalGain = { task, gain }
		}
		return optimalGain.task
	}

	public static getTerritoryWarfareTask(ns: NS): GangTask {
		return GangTask.getTask(ns, 'Territory Warfare')
	}

	public static getUnassignedTask(ns: NS): GangTask {
		return GangTask.getTask(ns, 'Unassigned')
	}

	private static calculateRespectGain(ns: NS, task: GangTask, member: GangMember): number {
		const taskStats: GangTasksStats    = task.getTaskStats(ns)
		const memberStats: GangMemberStats = member.getGangMemberStats(ns)
		const gangInformation: GangGenInfo = ns.gang.getGangInformation()

		if (taskStats.baseRespect === 0) return 0

		let statWeight: number = (taskStats.hackWeight / 100) * memberStats.hack +
			(taskStats.strWeight / 100) * memberStats.str +
			(taskStats.defWeight / 100) * memberStats.def +
			(taskStats.dexWeight / 100) * memberStats.dex +
			(taskStats.agiWeight / 100) * memberStats.agi +
			(taskStats.chaWeight / 100) * memberStats.cha

		statWeight -= (4 * taskStats.difficulty)
		if (statWeight <= 0) return 0

		const territoryMultiplier: number = Math.max(0.005, Math.pow(gangInformation.territory * 100, taskStats.territory.respect) / 100)
		if (isNaN(territoryMultiplier) || territoryMultiplier <= 0) return 0

		const respectMultiplier: number = HomeGang.calculateWantedPenalty(ns, gangInformation)

		return 11 * taskStats.baseRespect * statWeight * territoryMultiplier * respectMultiplier
	}

	private static calculateMoneyGain(ns: NS, task: GangTask, member: GangMember): number {
		const taskStats: GangTasksStats    = task.getTaskStats(ns)
		const memberStats: GangMemberStats = member.getGangMemberStats(ns)
		const gangInformation: GangGenInfo = ns.gang.getGangInformation()

		if (taskStats.baseMoney === 0) return 0

		let statWeight: number = (taskStats.hackWeight / 100) * memberStats.hack +
			(taskStats.strWeight / 100) * memberStats.str +
			(taskStats.defWeight / 100) * memberStats.def +
			(taskStats.dexWeight / 100) * memberStats.dex +
			(taskStats.agiWeight / 100) * memberStats.agi +
			(taskStats.chaWeight / 100) * memberStats.cha

		statWeight -= (3.2 * taskStats.difficulty)
		if (statWeight <= 0) return 0

		const territoryMultiplier: number = Math.max(0.005, Math.pow(gangInformation.territory * 100, taskStats.territory.money) / 100)
		if (isNaN(territoryMultiplier) || territoryMultiplier <= 0) return 0

		const respectMultiplier: number = HomeGang.calculateWantedPenalty(ns, gangInformation)

		return 5 * taskStats.baseMoney * statWeight * territoryMultiplier * respectMultiplier
	}

	private static calculateWantedLevelGain(ns: NS, task: GangTask, member: GangMember): number {
		const taskStats: GangTasksStats    = task.getTaskStats(ns)
		const memberStats: GangMemberStats = member.getGangMemberStats(ns)
		const gangInformation: GangGenInfo = ns.gang.getGangInformation()

		if (taskStats.baseWanted === 0) return 0

		let statWeight: number = (taskStats.hackWeight / 100) * memberStats.hack +
			(taskStats.strWeight / 100) * memberStats.str +
			(taskStats.defWeight / 100) * memberStats.def +
			(taskStats.dexWeight / 100) * memberStats.dex +
			(taskStats.agiWeight / 100) * memberStats.agi +
			(taskStats.chaWeight / 100) * memberStats.cha

		statWeight -= (3.5 * taskStats.difficulty)
		if (statWeight <= 0) return 0

		const territoryMultiplier: number = Math.max(0.005, Math.pow(gangInformation.territory * 100, taskStats.territory.wanted) / 100)
		if (isNaN(territoryMultiplier) || territoryMultiplier <= 0) return 0

		if (taskStats.baseWanted < 0) {
			return 0.4 * taskStats.baseWanted * statWeight * territoryMultiplier
		}
		const calc = 7 * taskStats.baseWanted / (Math.pow(3 * statWeight * territoryMultiplier, 0.8))

		// Put an arbitrary cap on this to prevent wanted level from rising too fast if the
		// denominator is very small. Might want to rethink formula later
		return Math.min(100, calc)
	}

	public getTaskStats(ns: NS): GangTasksStats {
		return ns.gang.getTaskStats(this.name)
	}
}