import { NS, Player } from 'Bitburner'
import * as LogAPI    from '/src/api/LogAPI.js'
import { CONSTANT }   from '/src/lib/constants.js'
import * as Utils     from '/src/util/Utils.js'
import { Managers }   from '/src/managers/Managers.js'
import * as ServerAPI from '/src/api/ServerAPI.js'

const RUNNER_INTERVAL: number     = 60000 as const
const MANAGER_START_DELAY: number = 50 as const

async function initialize(ns: NS) {

	Utils.disableLogging(ns)

	ns.atExit(destroy.bind(null, ns))

	const flags = ns.flags([
		['hacking', false],
		['bladeburner', false],
		['gang', false],
		['sleeve', false],
		['stock', false],
		['corporation', false],
		['hacknet', false],
		['auto', false],
	])

	await ServerAPI.initializeServerMap(ns)

	const tasks: Promise<void>[] = []

	if (flags.auto) {
		tasks.push(startManager(ns, Managers.HackingManager))

		// The hacknet flag should be set, as it often is not needed as much
		if (flags.hacknet) tasks.push(startManager(ns, Managers.HacknetManager))

		const player: Player = ns.getPlayer()

		if (ns.bladeburner.joinBladeburnerDivision()) tasks.push(startManager(ns, Managers.BladeBurnerManager))
		if (ns.gang.inGang()) tasks.push(startManager(ns, Managers.GangManager))
		if (ns.sleeve.getNumSleeves() > 0) tasks.push(startManager(ns, Managers.SleeveManager))
		if (player.hasWseAccount && player.hasTixApiAccess && player.has4SData && player.has4SDataTixApi) tasks.push(startManager(ns, Managers.StockManager))
	} else {
		// Managers
		if (flags.hacking) tasks.push(startManager(ns, Managers.HackingManager))
		if (flags.bladeburner) tasks.push(startManager(ns, Managers.BladeBurnerManager))
		if (flags.gang) tasks.push(startManager(ns, Managers.GangManager))
		if (flags.sleeve) tasks.push(startManager(ns, Managers.SleeveManager))
		if (flags.stock) tasks.push(startManager(ns, Managers.StockManager))
		if (flags.corporation) tasks.push(startManager(ns, Managers.CorporationManager))
		if (flags.hacknet) tasks.push(startManager(ns, Managers.HacknetManager))
	}

	// Runners
	tasks.push(launchRunners(ns))

	await Promise.allSettled(tasks)
}

async function launchRunners(ns: NS): Promise<void> {
	const purchasedServerRunner: Promise<void> = launchRunner(ns, '/src/runners/PurchasedServerRunner.js')
	const programRunner: Promise<void>         = launchRunner(ns, '/src/runners/ProgramRunner.js')
	const codingContractRunner: Promise<void>  = launchRunner(ns, '/src/runners/CodingContractRunner.js')

	await Promise.allSettled([purchasedServerRunner, programRunner, codingContractRunner])
}

async function launchRunner(ns: NS, script: string): Promise<void> {

	// TODO: Check if we have enough ram available to run

	const pid: number = ns.run(script)

	if (pid !== -1) {
		const scriptNamePattern              = /\/src\/runners\/(\w+)\.js/
		const match: RegExpMatchArray | null = script.match(scriptNamePattern)
		if (!match) throw new Error('Could not get the name of the script')
		LogAPI.printLog(ns, `Running the ${match[1]}`)
	}

	while (ns.isRunning(pid)) {
		await ns.asleep(CONSTANT.SMALL_DELAY)
	}
}


function destroy(ns: NS): void {
	LogAPI.printTerminal(ns, 'Stopping the daemon')
}

export async function startManager(ns: NS, manager: Managers): Promise<void> {
	if (isManagerRunning(ns, manager)) return

	// TODO: Check whether there is enough ram available

	ns.exec(manager, CONSTANT.HOME_SERVER_HOST)

	while (!isManagerRunning(ns, manager)) {
		await ns.asleep(MANAGER_START_DELAY)
	}
}

export function isManagerRunning(ns: NS, manager: Managers): boolean {
	return ns.isRunning(manager, CONSTANT.HOME_SERVER_HOST)
}

export async function main(ns: NS) {

	const hostName: string = ns.getHostname()
	if (hostName !== 'home') {
		throw new Error('Execute daemon script from home.')
	}

	// TODO: Make a decision on whether we start the to-be-made early hacking scripts,
	// or whether we want to start hacking using our main hacker

	await initialize(ns)

	LogAPI.printTerminal(ns, 'Starting the daemon')

	while (true) {
		await launchRunners(ns)
		await ns.asleep(RUNNER_INTERVAL)
	}
}