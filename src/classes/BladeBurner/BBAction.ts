import type { BitBurner as NS, BladeburnerBlackOps } from 'Bitburner'
import { BBActionName, BBActionType }                from '/src/classes/BladeBurner/BBInterfaces.js'
import { CONSTANT }                                  from '/src/lib/constants.js'
import * as LogAPI                                   from '/src/api/LogAPI.js'
import { LogType }                                   from '/src/api/LogAPI.js'

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

		return actualTime * CONSTANT.MILLISECONDS_IN_SECOND + ACTION_SLACK
	}

	public getChance(ns: NS): number {
		return ns.bladeburner.getActionEstimatedSuccessChance(this.type, this.name)
	}

	public isAchievable(ns: NS): boolean {
		if (this.type === 'black ops') {
			if (ns.bladeburner.getRank() < ns.bladeburner.getBlackOpRank(this.name as BladeburnerBlackOps)) {
				return false
			}
		}
		return this.getChance(ns) > CHANCE_THRESHOLD
	}

	public getBlackOpRank(ns: NS): number {
		if (this.type !== 'black ops') throw new Error('Cannot get the BlackOps rank for other actions')
		return ns.bladeburner.getBlackOpRank(this.name as BladeburnerBlackOps)
	}

	public async execute(ns: NS): Promise<void> {
		ns.bladeburner.startAction(this.type, this.name)
		LogAPI.log(ns, `Executing ${this.type} action '${this.name}'`, LogType.BLADEBURNER)
		await ns.sleep(this.getDuration(ns))
	}
}