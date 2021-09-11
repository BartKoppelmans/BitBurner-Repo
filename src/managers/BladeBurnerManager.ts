import type { BitBurner as NS, BladeburnerCurAction } from 'Bitburner'
import * as ControlFlowAPI                            from '/src/api/ControlFlowAPI.js'
import * as LogAPI                                    from '/src/api/LogAPI.js'
import * as Utils                                     from '/src/util/Utils.js'
import { Manager }                                    from '/src/classes/Misc/ScriptInterfaces.js'
import { CONSTANT }                                   from '/src/lib/constants.js'
import BBAction                                       from '/src/classes/BladeBurner/BBAction.js'
import { BBSkill }                                    from '/src/classes/BladeBurner/BBSkill.js'
import * as BladeBurnerUtils                          from '/src/util/BladeBurnerUtils.js'
import * as PlayerUtils                               from '/src/util/PlayerUtils.js'
import { BBActionChance, BBSkillPriority }            from '/src/classes/BladeBurner/BBInterfaces.js'
import { BBCity }                                     from '/src/classes/BladeBurner/BBCity.js'

const MONEY_THRESHOLD: number                 = 1e9 as const // 1 billion
const JOIN_DELAY: number                      = 60000 as const
const MANAGING_LOOP_DELAY: number             = 100 as const
const BUSY_RETRY_DELAY: number                = 1000 as const
const SYNTH_POPULATION_THRESHOLD: number      = 1e8 as const
const SYNTH_COMMUNITY_THRESHOLD: number       = 5 as const
const CHAOS_THRESHOLD: number                 = 100 as const
const FINAL_BLACK_OP_WARNING_INTERVAL: number = 10 as const

class BladeBurnerManager implements Manager {

	private iterationCounter: number = 1

	private managingLoopTimeout?: ReturnType<typeof setTimeout>

	private actions!: BBAction[]
	private skills!: BBSkill[]
	private cities!: BBCity[]

	private static getStaminaPercentage(ns: NS): number {
		const [current, total] = ns.bladeburner.getStamina()
		return (current / total) * 100
	}

	private static isTired(ns: NS): boolean {
		return BladeBurnerManager.getStaminaPercentage(ns) <= 50
	}

	private static shouldMove(ns: NS, currentCity: BBCity): boolean {
		return currentCity.getPopulation(ns) < SYNTH_POPULATION_THRESHOLD
	}

	private static shouldTrain(ns: NS): boolean {
		const player: any = PlayerUtils.getPlayer(ns)
		return ns.bladeburner.getRank() > 1000 && (
			player.agility < 100 ||
			player.defense < 100 ||
			player.dexterity < 100 ||
			player.strength < 100
		)
	}

	private static shouldAnalyze(ns: NS, actions: BBAction[]): boolean {
		return actions.some((action: BBAction) => {
			const chance: BBActionChance = action.getChance(ns)
			return (chance.upper !== chance.lower)
		})
	}

	private static hasSimulacrum(ns: NS) {
		const augs = ns.getOwnedAugmentations()
		return augs.includes('The Blade\'s Simulacrum')
	}

	private static shouldSkipIteration(ns: NS): boolean {
		return !BladeBurnerManager.hasSimulacrum(ns) &&
			(ns.isBusy() || ns.scriptRunning('/src/scripts/executeCrimes.js', CONSTANT.HOME_SERVER_HOST))
	}

	public async initialize(ns: NS) {
		Utils.disableLogging(ns)

		while (!ns.bladeburner.joinBladeburnerDivision()) {
			LogAPI.log(ns, `Waiting to join BladeBurner Division`)
			await ns.sleep(JOIN_DELAY)
		}

		this.actions = BladeBurnerUtils.createActions(ns)
		this.skills  = BladeBurnerUtils.createSkills(ns)
		this.cities  = BladeBurnerUtils.createCities(ns)
	}

	public async start(ns: NS): Promise<void> {
		LogAPI.debug(ns, `Starting the BladeBurnerManager`)

		this.managingLoopTimeout = setTimeout(this.managingLoop.bind(this, ns), MANAGING_LOOP_DELAY)
	}

	public async destroy(ns: NS): Promise<void> {
		if (this.managingLoopTimeout) clearTimeout(this.managingLoopTimeout)

		ns.bladeburner.stopBladeburnerAction()

		LogAPI.debug(ns, `Stopping the BladeBurnerManager`)
	}

	private shouldPreferContracts(ns: NS): boolean {
		return this.canFinishBitNode(ns) || PlayerUtils.getMoney(ns) < MONEY_THRESHOLD
	}

	private canFinishBitNode(ns: NS): boolean {
		// We try to do the next BlackOp if possible
		const achievableBlackOps: BBAction[] | undefined = BladeBurnerUtils.getAchievableBlackOps(ns, this.actions)
		if (achievableBlackOps.length > 0) {
			const nextBlackOp: BBAction = achievableBlackOps[0]
			if (nextBlackOp.name === 'Operation Daedalus') return true
		}
		return false
	}

	private async managingLoop(ns: NS): Promise<void> {

		const nextLoop = (isIteration: boolean) => {
			if (isIteration) this.iterationCounter++
			this.managingLoopTimeout = setTimeout(this.managingLoop.bind(this, ns), MANAGING_LOOP_DELAY)
			return
		}

		this.upgradeSkills(ns)

		// NOTE: This might still have some problems
		if (BladeBurnerManager.shouldSkipIteration(ns)) {
			await ns.sleep(BUSY_RETRY_DELAY)
			return nextLoop(false)
		}

		if (this.canFinishBitNode(ns) && ((this.iterationCounter) % FINAL_BLACK_OP_WARNING_INTERVAL === 0)) {
			LogAPI.warn(ns, `We are ready to finish the final BlackOp`)
		}

		// We start our regen if we are tired
		if (BladeBurnerManager.isTired(ns)) {
			const regenAction: BBAction = BladeBurnerUtils.getAction(ns, this.actions, 'Hyperbolic Regeneration Chamber')
			return regenAction.execute(ns, this.iterationCounter).then(nextLoop.bind(this, false))
		}

		// Check whether we have enough Synths, otherwise move or search for new ones
		const currentCity: BBCity = this.cities.find((city) => city.isCurrent(ns)) as BBCity
		if (BladeBurnerManager.shouldMove(ns, currentCity)) {
			const cities: BBCity[] = this.cities
			                             .sort((a, b) => {
				                             return b.getPopulation(ns) - a.getPopulation(ns)
			                             })

			if (this.cities[0].name !== currentCity.name) this.cities[0].moveTo(ns)
		}

		const currentAction: BBAction | undefined = this.getCurrentAction(ns)
		const nextAction: BBAction                = this.findOptimalAction(ns)

		// This makes sure that we don't unnecessarily stop our current action to start the same one
		if (currentAction && currentAction.name === nextAction.name) {
			return nextAction.continue(ns, this.iterationCounter).then(nextLoop.bind(this, true))
		} else return nextAction.execute(ns, this.iterationCounter).then(nextLoop.bind(this, true))
	}

	private getCurrentAction(ns: NS): BBAction | undefined {
		const currentAction: BladeburnerCurAction = ns.bladeburner.getCurrentAction()
		if (currentAction.type === 'Idle') return undefined

		return BladeBurnerUtils.getAction(ns, this.actions, currentAction.name)
	}

	private findOptimalAction(ns: NS): BBAction {

		const currentCity: BBCity = this.cities.find((city) => city.isCurrent(ns)) as BBCity

		if (BladeBurnerManager.shouldAnalyze(ns, this.actions)) return BladeBurnerUtils.getAction(ns, this.actions, 'Field Analysis')

		// NOTE: Now we have figured out that there is basically nothing to do...
		if (currentCity.getChaos(ns) > CHAOS_THRESHOLD) {
			return BladeBurnerUtils.getAction(ns, this.actions, 'Diplomacy')
		}

		// Check whether we should train more
		if (BladeBurnerManager.shouldTrain(ns)) {
			return BladeBurnerUtils.getAction(ns, this.actions, 'Training')
		}

		// We try to do the next BlackOp if possible
		const achievableBlackOps: BBAction[] | undefined = BladeBurnerUtils.getAchievableBlackOps(ns, this.actions)
		if (achievableBlackOps.length > 0) {
			const nextBlackOp: BBAction = achievableBlackOps[0]
			if (nextBlackOp.name !== 'Operation Daedalus') return nextBlackOp
		}

		// We try to do operations if possible
		const achievableOperations: BBAction[] | undefined = BladeBurnerUtils.getAchievableActions(ns, this.actions, 'operations')
		const achievableContracts: BBAction[] | undefined  = BladeBurnerUtils.getAchievableActions(ns, this.actions, 'contracts')

		// If we have little money, prefer contracts over operations
		if (achievableOperations.length > 0 && achievableContracts.length > 0) {
			return (this.shouldPreferContracts(ns)) ? achievableContracts[0] : achievableOperations[0]
		}

		// Otherwise, do whatever we can
		if (achievableOperations.length > 0) {
			return achievableOperations[0]
		}

		// We try to do contracts if possible
		if (achievableContracts.length > 0) {
			return achievableContracts[0]
		}

		// Our final resort is to just do some training
		return BladeBurnerUtils.getAction(ns, this.actions, 'Training')
	}

	private upgradeSkills(ns: NS): void {
		const highPrioritySkills: BBSkill[]   = BladeBurnerUtils.filterSkills(ns, this.skills, BBSkillPriority.HIGH)
		const mediumPrioritySkills: BBSkill[] = BladeBurnerUtils.filterSkills(ns, this.skills, BBSkillPriority.MEDIUM)
		const lowPrioritySkills: BBSkill[]    = BladeBurnerUtils.filterSkills(ns, this.skills, BBSkillPriority.LOW)

		const skillSets: BBSkill[][] = [highPrioritySkills, mediumPrioritySkills, lowPrioritySkills]

		const upgradedSkills: BBSkill[] = []

		for (const skillSet of skillSets) {
			let hasUpgraded
			do {
				hasUpgraded = false

				for (const skill of skillSet) {
					if (skill.canUpgrade(ns)) {
						skill.upgrade(ns)

						const index: number = upgradedSkills.findIndex((upgradedSkill) => upgradedSkill.name === skill.name)
						if (index === -1) upgradedSkills.push(skill)

						hasUpgraded = true
					}
				}
			} while (hasUpgraded)
		}

		upgradedSkills.forEach((skill) => LogAPI.log(ns, `Upgraded skill '${skill.name}' to level ${skill.getLevel(ns)}`))

	}
}

export async function start(ns: NS): Promise<void> {
	if (isRunning(ns)) return

	// TODO: Check whether there is enough ram available

	ns.exec('/src/managers/BladeBurnerManager.js', CONSTANT.HOME_SERVER_HOST)

	while (!isRunning(ns)) {
		await ns.sleep(CONSTANT.SMALL_DELAY)
	}
}

export function isRunning(ns: NS): boolean {
	return ns.isRunning('/src/managers/BladeBurnerManager.js', CONSTANT.HOME_SERVER_HOST)
}

export async function main(ns: NS) {
	if (ns.getHostname() !== 'home') {
		throw new Error('Run the script from home')
	}

	const instance: BladeBurnerManager = new BladeBurnerManager()

	await instance.initialize(ns)
	await instance.start(ns)

	while (!ControlFlowAPI.hasManagerKillRequest(ns)) {
		await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL)
	}

	await instance.destroy(ns)
}