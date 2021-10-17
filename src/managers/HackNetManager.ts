import type { BitBurner as NS, Player } from 'Bitburner'
import * as LogAPI                      from '/src/api/LogAPI.js'
import * as Utils                       from '/src/util/Utils.js'
import { Manager }                      from '/src/classes/Misc/ScriptInterfaces.js'
import { CONSTANT }                     from '/src/lib/constants.js'
import * as PlayerUtils                 from '/src/util/PlayerUtils.js'
import { getPlayer }                    from '/src/util/PlayerUtils.js'
import { HacknetServer }                from '/src/classes/Server/HacknetServer.js'

const LOOP_DELAY: number        = 1000 as const
const HACKNET_ALLOWANCE: number = 0.25 as const
const PAYOFF_TIME: number       = 3600 as const // Should pay off in an hour

class HackNetManager implements Manager {

	private managingLoopTimeout?: ReturnType<typeof setTimeout>

	public static getTotalServerGainRate(ns: NS, servers: HacknetServer[]): number {
		const player: Player = getPlayer(ns)
		return servers.reduce((total, server) => total + server.getGainRate(ns, player), 0)
	}

	public static getNewServerGainRate(ns: NS): number {
		const player: Player = getPlayer(ns)
		return ns.formulas.hacknetServers.hashGainRate(1, 0, 1, 1, player.hacknet_node_money_mult)
	}

	private static getBudget(ns: NS): number {
		return PlayerUtils.getMoney(ns) * HACKNET_ALLOWANCE
	}

	public async initialize(ns: NS) {
		Utils.disableLogging(ns)

		ns.atExit(this.destroy.bind(this, ns))
	}

	public async start(ns: NS): Promise<void> {
		LogAPI.printTerminal(ns, `Starting the HackNetManager`)

		this.managingLoopTimeout = setTimeout(this.managingLoop.bind(this, ns), LOOP_DELAY)
	}

	public async destroy(ns: NS): Promise<void> {
		if (this.managingLoopTimeout) clearTimeout(this.managingLoopTimeout)

		LogAPI.printTerminal(ns, `Stopping the HackNetManager`)
	}

	private async managingLoop(ns: NS): Promise<void> {
		// const hacknetServers: HacknetServer[] = ServerAPI.getHacknetServers(ns)

		// const oldGainRate: number = HackNetManager.getTotalServerGainRate(ns, hacknetServers)

		this.managingLoopTimeout = setTimeout(this.managingLoop.bind(this, ns), LOOP_DELAY)
	}

}

export async function main(ns: NS) {
	if (ns.getHostname() !== 'home') {
		throw new Error('Run the script from home')
	}

	const instance: HackNetManager = new HackNetManager()

	await instance.initialize(ns)
	await instance.start(ns)

	while (true) {
		await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL)
	}
}