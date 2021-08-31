import type { BitBurner as NS, GangGenInfo, GangName } from 'Bitburner'
import Gang                                            from '/src/classes/Gang/Gang.js'

export default class HomeGang extends Gang {


	public constructor(ns: NS, name: GangName) {
		super(ns, name)
	}

	public static getHomeGang(ns: NS): HomeGang {
		const name: GangName = ns.gang.getGangInformation().faction
		return new HomeGang(ns, name)
	}

	public getGangInformation(ns: NS): GangGenInfo {
		return ns.gang.getGangInformation()
	}
}