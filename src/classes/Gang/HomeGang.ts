import type { BitBurner as NS, GangGenInfo, GangName } from 'Bitburner'
import Gang                                            from '/src/classes/Gang/Gang.js'
import * as LogAPI                                     from '/src/api/LogAPI.js'
import { LogType }                                     from '/src/api/LogAPI.js'

export default class HomeGang extends Gang {


	public constructor(ns: NS, name: GangName) {
		super(ns, name)
	}

	public static getHomeGang(ns: NS): HomeGang {
		const name: GangName = ns.gang.getGangInformation().faction
		return new HomeGang(ns, name)
	}

	public calculateWantedPenalty(ns: NS): number {
		const gangInformation: GangGenInfo = this.getGangInformation(ns)
		return (gangInformation.respect) / (gangInformation.respect + gangInformation.wantedLevel)
	}

	public static calculateWantedPenalty(ns: NS, gangInformation: GangGenInfo): number {
		return (gangInformation.respect) / (gangInformation.respect + gangInformation.wantedLevel)
	}

	public enableTerritoryWarfare(ns: NS): void {
		const clashChance: number  = this.getGangInformation(ns).territoryClashChance
		const isInWarfare: boolean = (clashChance === 1)

		if (isInWarfare) return

		ns.gang.setTerritoryWarfare(true)
		LogAPI.log(ns, `Enabling territory warfare`, LogType.GANG)
	}

	public disableTerritoryWarfare(ns: NS): void {
		const clashChance: number  = this.getGangInformation(ns).territoryClashChance
		const isInWarfare: boolean = (clashChance === 1)

		if (!isInWarfare) return;

		ns.gang.setTerritoryWarfare(false)
		LogAPI.log(ns, `Disabling territory warfare`, LogType.GANG)
	}

	public getGangInformation(ns: NS): GangGenInfo {
		return ns.gang.getGangInformation()
	}
}