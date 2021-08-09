import type { BitBurner as NS } from 'Bitburner'
import Server                   from '/src/classes/Server.js'
import {
	ServerCharacteristics,
	ServerPurpose,
	ServerStatus,
	StaticHackingProperties,
	TreeStructure,
}                               from '/src/interfaces/ServerInterfaces.js'
import { CONSTANT }             from '/src/lib/constants.js'
import { Heuristics }           from '/src/util/Heuristics.js'

export default class HackableServer extends Server {

	status: ServerStatus = ServerStatus.NONE

	staticHackingProperties: StaticHackingProperties
	percentageToSteal: number

	serverValue?: Heuristics.HeuristicValue

	constructor(ns: NS, characteristics: ServerCharacteristics, treeStructure?: TreeStructure, purpose: ServerPurpose = ServerPurpose.NONE, status: ServerStatus = ServerStatus.NONE) {
		super(ns, characteristics, treeStructure, purpose)
		this.status                  = status
		this.staticHackingProperties = this.getStaticHackingProperties(ns)
		this.percentageToSteal       = CONSTANT.DEFAULT_PERCENTAGE_TO_STEAL
	}

	private getStaticHackingProperties(ns: NS): StaticHackingProperties {
		return {
			ports: ns.getServerNumPortsRequired(this.characteristics.host),
			hackingLevel: ns.getServerRequiredHackingLevel(this.characteristics.host),
			maxMoney: ns.getServerMaxMoney(this.characteristics.host),
			growth: ns.getServerGrowth(this.characteristics.host),
			minSecurityLevel: ns.getServerMinSecurityLevel(this.characteristics.host),
			baseSecurityLevel: ns.getServerBaseSecurityLevel(this.characteristics.host),
		}
	}

	public getServer(ns: NS) {
		return (ns as any).getServer()
	}

	public getSecurityLevel(ns: NS): number {
		return ns.getServerSecurityLevel(this.characteristics.host)
	}

	public getMoney(ns: NS): number {
		return ns.getServerMoneyAvailable(this.characteristics.host)
	}

	public getWeakenTime(ns: NS) {
		return ns.getWeakenTime(this.characteristics.host)
	}

	public getHackTime(ns: NS) {
		return ns.getHackTime(this.characteristics.host)
	}

	public getGrowTime(ns: NS) {
		return ns.getGrowTime(this.characteristics.host)
	}

	// Setter for server Value
	async evaluate(ns: NS, heuristic: Heuristics.ServerHeuristic): Promise<Heuristics.HeuristicValue> {
		return this.serverValue = heuristic(ns, this)
	}

	public isHackable(ns: NS) {
		return ns.getServerRequiredHackingLevel(this.characteristics.host) <= ns.getHackingLevel()
	}

	public setStatus(status: ServerStatus): void {
		this.status = status
	}

	public isOptimal(ns: NS): boolean {
		return this.getSecurityLevel(ns) === this.staticHackingProperties.minSecurityLevel &&
			this.getMoney(ns) === this.staticHackingProperties.maxMoney
	}

	public needsGrow(ns: NS): boolean {
		return this.getMoney(ns) < this.staticHackingProperties.maxMoney
	}

	public needsWeaken(ns: NS): boolean {
		return this.getSecurityLevel(ns) > this.staticHackingProperties.minSecurityLevel
	}

	public toJSON() {
		const json: any = super.toJSON()

		return {
			...json,
			status: this.status,
		}

	}
}