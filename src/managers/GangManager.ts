import type { BitBurner as NS, FactionName } from 'Bitburner'
import * as ControlFlowAPI                   from '/src/api/ControlFlowAPI.js'
import * as LogAPI                           from '/src/api/LogAPI.js'
import { LogType }                           from '/src/api/LogAPI.js'
import * as Utils                            from '/src/util/Utils.js'
import * as GangUtils                        from '/src/util/GangUtils.js'
import { Manager }                           from '/src/classes/Misc/ScriptInterfaces.js'
import { CONSTANT }                          from '/src/lib/constants.js'
import GangMember                            from '/src/classes/Gang/GangMember.js'
import GangTask                              from '/src/classes/Gang/GangTask.js'
import { GangAscensionPoints }               from '/src/classes/Gang/GangInterfaces.js'
import GangUpgrade                           from '/src/classes/Gang/GangUpgrade.js'
import * as PlayerUtils                      from '/src/util/PlayerUtils.js'

const MANAGING_LOOP_DELAY: number            = 1000 as const
const CREATE_GANG_DELAY: number              = 10000 as const
const ASCENSION_MULTIPLIER_THRESHOLD: number = 2 as const
const GANG_ALLOWANCE: number                 = 0.1 as const

class GangManager implements Manager {

	private managingLoopTimeout?: ReturnType<typeof setTimeout>

	private members: GangMember[]   = []
	private upgrades: GangUpgrade[] = []

	public async initialize(ns: NS) {
		Utils.disableLogging(ns)

		await GangManager.createGang(ns)

		this.members  = GangMember.getAllGangMembers(ns)
		this.upgrades = GangUpgrade.getAllUpgrades(ns)
	}

	public async start(ns: NS): Promise<void> {
		LogAPI.debug(ns, `Starting the GangManager`)


		this.managingLoopTimeout = setTimeout(this.managingLoop.bind(this, ns), MANAGING_LOOP_DELAY)
	}

	public async destroy(ns: NS): Promise<void> {
		if (this.managingLoopTimeout) clearTimeout(this.managingLoopTimeout)

		LogAPI.debug(ns, `Stopping the GangManager`)
	}

	private async managingLoop(ns: NS): Promise<void> {

		while (ns.gang.canRecruitMember()) {
			this.recruitMember(ns)
			await ns.sleep(CONSTANT.SMALL_DELAY)
		}

		this.members.forEach((member) => this.manageMember(ns, member))

		this.managingLoopTimeout = setTimeout(this.managingLoop.bind(this, ns), MANAGING_LOOP_DELAY)
	}

	private static async createGang(ns: NS): Promise<void> {
		while (!ns.gang.inGang()) {
			const factions: FactionName[] = ns.getPlayer().factions

			if (!factions.includes('Slum Snakes')) {
				const invitations: FactionName[] = ns.checkFactionInvitations()
				if (!invitations.includes('Slum Snakes')) {
					await ns.sleep(CREATE_GANG_DELAY)
					continue
				}

				ns.joinFaction('Slum Snakes')
			}

			ns.gang.createGang('Slum Snakes')
		}
	}

	private manageMember(ns: NS, member: GangMember): void {

		if (GangManager.shouldAscend(ns, member)) {
			member.ascend(ns)
		}

		let remainingUpgrades: GangUpgrade[] = this.upgrades.filter((upgrade) => !member.upgrades.some((memberUpgrade) => upgrade.name === memberUpgrade.name))
		remainingUpgrades                    = GangUpgrade.sortUpgrades(ns, remainingUpgrades)

		for (const upgrade of remainingUpgrades) {
			if (GangManager.canAfford(ns, upgrade)) {
				member.purchaseUpgrade(ns, upgrade)
			}
		}

		// TODO: Assign tasks
	}

	private static shouldAscend(ns: NS, member: GangMember): boolean {
		const ascensionResults: GangAscensionPoints = member.getAscensionResults(ns)
		return ascensionResults.hack * ascensionResults.str * ascensionResults.def * ascensionResults.dex * ascensionResults.agi * ascensionResults.cha >= ASCENSION_MULTIPLIER_THRESHOLD
	}

	private static canAfford(ns: NS, upgrade: GangUpgrade): boolean {
		const money: number = PlayerUtils.getMoney(ns) * GANG_ALLOWANCE
		return upgrade.cost <= money
	}

	private recruitMember(ns: NS): void {
		const name: string          = GangUtils.generateName(ns)
		const isSuccessful: boolean = ns.gang.recruitMember(name)
		if (!isSuccessful) {
			LogAPI.warn(ns, `Failed to recruit a new member`)
			return
		} else LogAPI.log(ns, `Recruited new gang member '${name}'`, LogType.GANG)

		const member: GangMember = new GangMember(ns, name)
		member.startTask(ns, new GangTask(ns, 'Ransomware'))
		this.members.push(member)
	}
}

export async function start(ns: NS): Promise<void> {
	if (isRunning(ns)) return

	// TODO: Check whether there is enough ram available

	ns.exec('/src/managers/GangManager.js', CONSTANT.HOME_SERVER_HOST)

	while (!isRunning(ns)) {
		await ns.sleep(CONSTANT.SMALL_DELAY)
	}
}

export function isRunning(ns: NS): boolean {
	return ns.isRunning('/src/managers/GangManager.js', CONSTANT.HOME_SERVER_HOST)
}

export async function main(ns: NS) {
	if (ns.getHostname() !== 'home') {
		throw new Error('Run the script from home')
	}

	const instance: GangManager = new GangManager()

	await instance.initialize(ns)
	await instance.start(ns)

	while (!ControlFlowAPI.hasManagerKillRequest(ns)) {
		await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL)
	}

	await instance.destroy(ns)
}