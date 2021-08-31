import type { BitBurner as NS, GangName, GangOtherInfo, GangOtherInfoObject } from 'Bitburner'

export default class Gang {

	name: GangName

	public constructor(ns: NS, name: GangName) {
		this.name = name
	}

	public static getGangs(ns: NS): Gang[] {
		const gangNames: GangName[] = ['Slum Snakes', 'Tetrads', 'The Syndicate', 'The Dark Army', 'Speakers for the Dead', 'NiteSec', 'The Black Hand']
		return gangNames.map((name) => new Gang(ns, name))
	}

	public getGangInformation(ns: NS): GangOtherInfoObject {
		const gangInformation: GangOtherInfo = ns.gang.getOtherGangInformation()
		return gangInformation[this.name]
	}

	public getPower(ns: NS): number {
		return this.getGangInformation(ns).power
	}

	public getTerritory(ns: NS): number {
		return this.getGangInformation(ns).territory
	}
}