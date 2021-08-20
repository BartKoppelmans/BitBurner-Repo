import type { BitBurner as NS }                                   from 'Bitburner'
import Server                                                     from '/src/classes/Server/Server.js'
import { IHackableServer, ServerStatus, StaticHackingProperties } from '/src/classes/Server/ServerInterfaces.js'
import { CONSTANT }                                               from '/src/lib/constants.js'
import { Heuristics }                                             from '/src/util/Heuristics.js'

export default class HackableServer extends Server {

	status: ServerStatus

	staticHackingProperties: StaticHackingProperties
	percentageToSteal: number

	serverValue: Heuristics.HeuristicValue

	constructor(ns: NS, server: Partial<IHackableServer>) {
		super(ns, server)

		this.status                  = (server.status) ? server.status : ServerStatus.NONE
		this.staticHackingProperties = (server.staticHackingProperties) ? server.staticHackingProperties : this.getStaticHackingProperties(ns)
		this.serverValue             = (server.serverValue) ? server.serverValue : Heuristics.DiscordHeuristic(ns, this)

		this.percentageToSteal = CONSTANT.DEFAULT_PERCENTAGE_TO_STEAL
	}

	public getSecurityLevel(ns: NS): number {
		return ns.getServerSecurityLevel(this.characteristics.host)
	}

	public getMoney(ns: NS): number {
		return ns.getServerMoneyAvailable(this.characteristics.host)
	}

	public getWeakenTime(ns: NS) {
		return ns.getWeakenTime(this.characteristics.host) * 1000
	}

	public getHackTime(ns: NS) {
		return ns.getHackTime(this.characteristics.host) * 1000
	}

	public getGrowTime(ns: NS) {
		return ns.getGrowTime(this.characteristics.host) * 1000
	}

	public isHackable(ns: NS) {
		return ns.getServerRequiredHackingLevel(this.characteristics.host) <= ns.getHackingLevel()
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
			staticHackingProperties: this.staticHackingProperties,
			serverValue: this.serverValue,
		}

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
}