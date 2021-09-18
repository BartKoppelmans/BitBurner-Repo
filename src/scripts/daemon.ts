import type { BitBurner as NS }             from 'Bitburner'
import * as ControlFlowAPI                  from '/src/api/ControlFlowAPI.js'
import * as LogAPI                          from '/src/api/LogAPI.js'
import { start as startJobManager }         from '/src/managers/JobManager.js'
import { start as startBladeBurnerManager } from '/src/managers/BladeBurnerManager.js'
import { start as startGangManager }        from '/src/managers/GangManager.js'
import { start as startSleeveManager }      from '/src/managers/SleeveManager.js'
import { start as startStockManager }       from '/src/managers/StockManager.js'
import { start as startHackingManager }     from '/src/managers/HackingManager.js'
import { CONSTANT }                         from '/src/lib/constants.js'
import * as Utils                           from '/src/util/Utils.js'


let runnerInterval: ReturnType<typeof setInterval>
const RUNNER_INTERVAL: number = 60000 as const

async function initialize(ns: NS) {

	Utils.disableLogging(ns)

	const flags = ns.flags([
		['bladeburner', false],
		['gang', false],
		['sleeve', false],
		['stock', false],
		['hacking', true],
	])

	// TODO: Kill all running scripts, as there might be some shit from last session open

	const tasks: Promise<void>[] = []

	// Managers
	tasks.push(startJobManager(ns))
	if (flags.hacking) tasks.push(startHackingManager(ns))
	if (flags.bladeburner) tasks.push(startBladeBurnerManager(ns))
	if (flags.gang) tasks.push(startGangManager(ns))
	if (flags.sleeve) tasks.push(startSleeveManager(ns))
	if (flags.stock) tasks.push(startStockManager(ns))

	// Runners
	tasks.push(ControlFlowAPI.launchRunners(ns))

	await Promise.allSettled(tasks)
}


export function destroy(ns: NS): void {
	clearTimeout(runnerInterval)

	LogAPI.debug(ns, 'Stopping the daemon')
}

export async function main(ns: NS) {

	const hostName: string = ns.getHostname()
	if (hostName !== 'home') {
		throw new Error('Execute daemon script from home.')
	}

	// TODO: Make a decision on whether we start the to-be-made early hacking scripts,
	// or whether we want to start hacking using our main hacker

	await initialize(ns)

	LogAPI.debug(ns, 'Starting the daemon')

	runnerInterval = setInterval(ControlFlowAPI.launchRunners.bind(null, ns), RUNNER_INTERVAL)

	// TODO: Here we should check whether we are still running the hackloop
	while (!ControlFlowAPI.hasDaemonKillRequest(ns)) {
		await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL)
	}

	destroy(ns)
}