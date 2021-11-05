import type { GangOtherInfo, GangOtherInfoObject, NS } from 'Bitburner'

export default class Gang {

	name: string

	public constructor(ns: NS, name: string) {
		this.name = name
	}

	public static getGangs(ns: NS): Gang[] {
		const gangNames: string[]  = ['Slum Snakes', 'Tetrads', 'The Syndicate', 'The Dark Army', 'Speakers for the Dead', 'NiteSec', 'The Black Hand']
		const homeGangName: string = ns.gang.getGangInformation().faction

		return gangNames.filter((gangName) => gangName !== homeGangName).map((name) => new Gang(ns, name))
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

	public getChanceToWinClash(ns: NS): number {
		return ns.gang.getChanceToWinClash(this.name)
	}
}