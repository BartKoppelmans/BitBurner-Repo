import { BitBurner as NS, City } from 'Bitburner'
import * as LogAPI               from '/src/api/LogAPI.js'

export class BBCity {

	name: City

	// TODO: Include some prioritization for skills

	public constructor(ns: NS, name: City) {
		this.name = name
	}

	public isCurrent(ns: NS): boolean {
		return ns.bladeburner.getCity() === this.name
	}

	public getPopulation(ns: NS): number {
		return ns.bladeburner.getCityEstimatedPopulation(this.name)
	}

	public getCommunities(ns: NS): number {
		return ns.bladeburner.getCityEstimatedCommunities(this.name)
	}

	public getChaos(ns: NS): number {
		return ns.bladeburner.getCityChaos(this.name)
	}

	public moveTo(ns: NS): void {
		ns.bladeburner.switchCity(this.name)
		LogAPI.log(ns, `Moved to ${this.name}`)
	}
}