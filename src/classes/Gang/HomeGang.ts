import type { BitBurner as NS, GangGenInfo, GangName } from 'Bitburner'
import Gang                                            from '/src/classes/Gang/Gang.js'
import * as LogAPI                                     from '/src/api/LogAPI.js'
import { LogType }                                     from '/src/api/LogAPI.js'

export default class HomeGang extends Gang {

	isInWarfare: boolean

	public constructor(ns: NS, name: GangName) {
		super(ns, name)

		const clashChance: number = this.getGangInformation(ns).territoryClashChance
		this.isInWarfare          = (clashChance === 1)
	}

	public static getHomeGang(ns: NS): HomeGang {
		const name: GangName = ns.gang.getGangInformation().faction
		return new HomeGang(ns, name)
	}

	public static calculateWantedPenalty(ns: NS, gangInformation: GangGenInfo): number {
		return (gangInformation.respect) / (gangInformation.respect + gangInformation.wantedLevel)
	}

	public calculateWantedPenalty(ns: NS): number {
		const gangInformation: GangGenInfo = this.getGangInformation(ns)
		return (gangInformation.respect) / (gangInformation.respect + gangInformation.wantedLevel)
	}

	public enableTerritoryWarfare(ns: NS): void {
		if (this.isInWarfare) return

		ns.gang.setTerritoryWarfare(true)
		this.isInWarfare = true
		LogAPI.log(ns, `Enabling territory warfare`, LogType.GANG)
	}

	public disableTerritoryWarfare(ns: NS): void {
		if (!this.isInWarfare) return

		ns.gang.setTerritoryWarfare(false)
		this.isInWarfare = false
		LogAPI.log(ns, `Disabling territory warfare`, LogType.GANG)
	}

	public getGangInformation(ns: NS): GangGenInfo {
		return ns.gang.getGangInformation()
	}
}