import type { BitBurner as NS } from 'Bitburner'
import { GangTaskName }         from '/src/classes/Gang/GangInterfaces.js'

export default class GangTask {

	name: GangTaskName

	public constructor(ns: NS, name: GangTaskName) {
		this.name = name
	}

	public execute(ns: NS): void {
		// Something
	}
}