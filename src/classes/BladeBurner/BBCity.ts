import { NS }      from 'Bitburner'
import * as LogAPI from '/src/api/LogAPI.js'

export class BBCity {

	name: string

	// TODO: Include some prioritization for skills

	public constructor(ns: NS, name: string) {
		this.name = name
	}

	public isCurrent(ns: NS): boolean {
		return ns.bladeburner.getCity() === this.name
	}

	public getPopulation(ns: NS): number {
		return ns.bladeburner.getCityEstimatedPopulation(this.name)
	}

	public getCommunities(ns: NS): number {
		return ns.bladeburner.getCityCommunities(this.name)
	}

	public getChaos(ns: NS): number {
		return ns.bladeburner.getCityChaos(this.name)
	}

	public moveTo(ns: NS): void {
		ns.bladeburner.switchCity(this.name)
		LogAPI.printLog(ns, `Moved to ${this.name}`)
	}
}