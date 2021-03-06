import type { NS }                                    from 'Bitburner'
import { BBActionChance, BBActionName, BBActionType } from '/src/classes/BladeBurner/BBInterfaces.js'
import * as LogAPI                                    from '/src/api/LogAPI.js'
import { BBCity }                                     from '/src/classes/BladeBurner/BBCity.js'

export const CHANCE_THRESHOLD: number = 0.95 as const
export const ACTION_SLACK: number     = 500 as const


export default class BBAction {

	name: BBActionName
	type: BBActionType

	public constructor(ns: NS, name: BBActionName, type: BBActionType) {
		this.name = name
		this.type = type
	}

	public getCount(ns: NS): number {
		return ns.bladeburner.getActionCountRemaining(this.type, this.name)
	}

	public getReputationGain(ns: NS): number {
		return ns.bladeburner.getActionRepGain(this.type, this.name)
	}

	public getDuration(ns: NS): number {

		const time: number      = ns.bladeburner.getActionTime(this.type, this.name) // In seconds
		const bonusTime: number = ns.bladeburner.getBonusTime() // In Seconds

		let actualTime: number

		if (bonusTime === 0) actualTime = time
		else if (bonusTime > time) actualTime = Math.ceil(time / 5)
		else actualTime = Math.ceil(bonusTime / 5) + (time - bonusTime)

		return actualTime + ACTION_SLACK
	}

	public getChance(ns: NS): BBActionChance {
		const [lower, upper] = ns.bladeburner.getActionEstimatedSuccessChance(this.type, this.name)
		return { lower, upper }
	}

	public isAchievable(ns: NS): boolean {
		if (this.type === 'black ops') {
			if (ns.bladeburner.getRank() < ns.bladeburner.getBlackOpRank(this.name)) {
				return false
			}
		}
		if (this.name === 'Raid') {
			const currentCity: BBCity = new BBCity(ns, ns.bladeburner.getCity())
			if (currentCity.getCommunities(ns) === 0) return false
		}
		return this.getChance(ns).lower > CHANCE_THRESHOLD
	}

	public getBlackOpRank(ns: NS): number {
		if (this.type !== 'black ops') throw new Error('Cannot get the BlackOps rank for other actions')
		return ns.bladeburner.getBlackOpRank(this.name)
	}

	public async continue(ns: NS, iteration: number): Promise<void> {

		// TODO: Decide whether we want to log continuing actions
		LogAPI.printLog(ns, `${ns.nFormat(iteration, '000000')} - Continuing ${this.type} action '${this.name}'`)

		await ns.asleep(this.getDuration(ns))
	}

	public async execute(ns: NS, iteration: number): Promise<void> {
		ns.bladeburner.startAction(this.type, this.name)
		LogAPI.printLog(ns, `${ns.nFormat(iteration, '000000')} - Executing  ${this.type} action '${this.name}'`)
		await ns.asleep(this.getDuration(ns))
	}
}