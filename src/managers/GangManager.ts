import type { GangGenInfo, NS }                                       from 'Bitburner'
import * as LogAPI                                                    from '/src/api/LogAPI.js'
import * as Utils                                                     from '/src/util/Utils.js'
import * as GangUtils                                                 from '/src/util/GangUtils.js'
import { Manager }                                                    from '/src/classes/Misc/ScriptInterfaces.js'
import { CONSTANT }                                                   from '/src/lib/constants.js'
import GangMember                                                     from '/src/classes/Gang/GangMember.js'
import GangTask                                                       from '/src/classes/Gang/GangTask.js'
import { GangAscensionPoints, GangMemberEvaluation, GangMemberStats } from '/src/classes/Gang/GangInterfaces.js'
import GangUpgrade                                                    from '/src/classes/Gang/GangUpgrade.js'
import * as PlayerUtils                                               from '/src/util/PlayerUtils.js'
import HomeGang                                                       from '/src/classes/Gang/HomeGang.js'
import Gang                                                           from '/src/classes/Gang/Gang.js'

const LOOP_DELAY: number                     = 2000 as const
const CREATE_GANG_DELAY: number              = 1000 as const
const ASCENSION_MULTIPLIER_THRESHOLD: number = 5 as const
const GANG_ALLOWANCE: number                 = 0.1 as const
const WANTED_PENALTY_THRESHOLD: number       = 0.25 as const // Percentage
const COMBAT_STAT_HIGH_THRESHOLD: number     = 2500 as const
const COMBAT_STAT_LOW_THRESHOLD: number      = 250 as const
const MAX_GANG_MEMBERS: number               = 12 as const
const CLASH_CHANCE_THRESHOLD: number         = 0.90 as const
const CLASH_CHANCE_THRESHOLD_BUFFER: number  = 0.05 as const
const POWER_THRESHOLD: number                = 500 as const
const POWER_THRESHOLD_BUFFER: number         = 50 as const
const RESPECT_THRESHOLD: number = 2.5e6 as const

class GangManager implements Manager {

	private gangs!: Gang[]
	private homeGang!: HomeGang
	private upgrades!: GangUpgrade[]

	private isIncreasingPower: boolean = false

	private focusOnRespect: boolean = false

	private static getBestMember(ns: NS, members: GangMember[]): GangMember {
		const isHacking: boolean = GangUtils.isHackingGang(ns)

		// TODO: Perhaps modify this to use the optimal respect gain?

		// TODO: Add something to prevent it from constantly switching

		const evaluations: GangMemberEvaluation[] = members.map((member) => {
			const stats: GangMemberStats = member.getGangMemberStats(ns)
			let score: number

			if (isHacking) score = stats.hack + stats.cha
			else score = stats.agi + stats.str + stats.dex + stats.def + stats.cha

			score += member.getGangMemberInformation(ns).earnedRespect

			return { member, score }
		}).sort((a, b) => b.score - a.score)

		return evaluations[0].member
	}

	private static getNumMembers(ns: NS): number {
		return ns.gang.getMemberNames().length
	}

	// TODO: Move this to the gang manager
	private static hasMaximumGangMembers(ns: NS): boolean {
		return GangManager.getNumMembers(ns) >= MAX_GANG_MEMBERS
	}

	private static hasReachedCombatStatsLevel(ns: NS, member: GangMember, level: number): boolean {
		const gangMemberStats: GangMemberStats = member.getGangMemberStats(ns)

		const average: number = (gangMemberStats.str + gangMemberStats.agi + gangMemberStats.def + gangMemberStats.dex) / 4

		return average > level
	}

	private static hasSufficientPower(ns: NS, homeGang: HomeGang): boolean {
		return homeGang.getPower(ns) > POWER_THRESHOLD
	}

	private static shouldContinueIncreasingPower(ns: NS, homeGang: HomeGang): boolean {
		return homeGang.getPower(ns) < POWER_THRESHOLD + POWER_THRESHOLD_BUFFER
	}

	private static hasSufficientChanceToWinClash(ns: NS, gangs: Gang[]): boolean {
		return gangs.every((gang) => gang.getChanceToWinClash(ns) >= CLASH_CHANCE_THRESHOLD)
	}

	private static shouldContinueIncreasingChanceToWinClash(ns: NS, gangs: Gang[]): boolean {
		return gangs.some((gang) => gang.getChanceToWinClash(ns) < (CLASH_CHANCE_THRESHOLD + CLASH_CHANCE_THRESHOLD_BUFFER))

	}

	private static shouldReduceWantedLevel(ns: NS): boolean {

		// TODO: Make sure that this takes respect into account more
		// When respect and wanted are both (equally) low, we should gain more respect
		// Otherwise, perhaps consider not ascending the highest respect person

		const gangInformation: GangGenInfo = ns.gang.getGangInformation()
		const wantedPenalty: number        = HomeGang.calculateWantedPenalty(ns, gangInformation)

		return (wantedPenalty <= WANTED_PENALTY_THRESHOLD)
	}

	private static hasMinimumWantedLevel(ns: NS): boolean {
		const gangInformation: GangGenInfo = ns.gang.getGangInformation()

		return (gangInformation.wantedLevel === 1)
	}

	private static isHackingGang(ns: NS): boolean {
		const gangInformation: GangGenInfo = ns.gang.getGangInformation()
		return gangInformation.isHacking
	}

	private static async createGang(ns: NS): Promise<void> {
		while (!ns.gang.inGang()) {
			const factions: string[] = ns.getPlayer().factions

			if (!factions.includes('Slum Snakes')) {
				const invitations: string[] = ns.checkFactionInvitations()
				if (!invitations.includes('Slum Snakes')) {
					await ns.asleep(CREATE_GANG_DELAY)
					continue
				}

				ns.joinFaction('Slum Snakes')
			}
			const hasCreatedGang: boolean = ns.gang.createGang('Slum Snakes')
			if (!hasCreatedGang) await ns.asleep(CREATE_GANG_DELAY)
		}
	}

	private static shouldAscend(ns: NS, member: GangMember): boolean {
		const ascensionResults: GangAscensionPoints = member.getAscensionResults(ns)
		return ascensionResults.hack * ascensionResults.str * ascensionResults.def * ascensionResults.dex * ascensionResults.agi * ascensionResults.cha >= ASCENSION_MULTIPLIER_THRESHOLD
	}

	private static canAfford(ns: NS, upgrade: GangUpgrade): boolean {
		const money: number = PlayerUtils.getMoney(ns) * GANG_ALLOWANCE
		return upgrade.cost <= money
	}

	private static recruitMember(ns: NS): GangMember | null {
		const name: string          = GangUtils.generateName(ns)
		const isSuccessful: boolean = ns.gang.recruitMember(name)
		if (!isSuccessful) {
			LogAPI.printLog(ns, `Failed to recruit a new member`)
			return null
		} else LogAPI.printLog(ns, `Recruited new gang member '${name}'`)

		return new GangMember(ns, name)
	}

	private static removeFocusSwitch(): void {
		const doc: Document                    = eval('document')
		const focusElement: HTMLElement | null = doc.getElementById('gangFocusSwitchContainer')
		if (focusElement) focusElement.remove()
	}

	public async initialize(ns: NS) {
		Utils.disableLogging(ns)

		ns.atExit(this.destroy.bind(this, ns))

		await GangManager.createGang(ns)

		this.upgrades = GangUpgrade.getAllUpgrades(ns)
		this.gangs    = Gang.getGangs(ns)
		this.homeGang = HomeGang.getHomeGang(ns)

		// this.createFocusSwitch()
	}

	public async start(ns: NS): Promise<void> {
		LogAPI.printTerminal(ns, `Starting the GangManager`)
	}

	public async destroy(ns: NS): Promise<void> {
		LogAPI.printTerminal(ns, `Stopping the GangManager`)

		const members: GangMember[] = GangMember.getAllGangMembers(ns)
		members.forEach((member) => member.startTask(ns, GangTask.getUnassignedTask(ns)))

		// GangManager.removeFocusSwitch()
	}

	private createFocusSwitch(): void {
		const doc: Document = eval('document')

		const appendSwitch = () => {
			// ----- Create a Container -----
			const gangFocusSwitchContainer     = doc.createElement('tr')
			gangFocusSwitchContainer.id        = 'gangFocusSwitchContainer'
			gangFocusSwitchContainer.innerHTML =
				`<input id="focus-respect" type="checkbox" value="respect" class="optionCheckbox"/>` +
				`<label for="focus-respect">Focus on respect</label>`

			gangFocusSwitchContainer.addEventListener('change', (event: Event) => {
				const target: HTMLInputElement = event.target as HTMLInputElement
				this.focusOnRespect            = target.checked
			})

			// Append container to DOM

			// @ts-ignore
			const element = doc.getElementById('character-overview-text').firstChild.firstChild
			if (element) element.appendChild(gangFocusSwitchContainer)
		}

		if (!doc.getElementById('gangFocusSwitchContainer')) appendSwitch()
	}

	public async managingLoop(ns: NS): Promise<void> {

		const reputation: number = ns.getFactionRep(this.homeGang.name)
		this.focusOnRespect = (reputation < RESPECT_THRESHOLD)

		if (!this.isIncreasingPower) {

			// Check whether we still have sufficient power and sufficient chance to win a clash

			if (GangManager.hasSufficientPower(ns, this.homeGang) && GangManager.hasSufficientChanceToWinClash(ns, this.gangs)) {
				this.homeGang.enableTerritoryWarfare(ns)
			} else {
				// We should start increasing power, so we disable territory warfare to decrease the chance of deaths
				this.homeGang.disableTerritoryWarfare(ns)
				this.isIncreasingPower = true
			}

		} else if (!GangManager.shouldContinueIncreasingPower(ns, this.homeGang) && !GangManager.shouldContinueIncreasingChanceToWinClash(ns, this.gangs)) {
			// We can stop increasing power, so we enable territory warfare again (as we will not have any deaths)
			this.homeGang.enableTerritoryWarfare(ns)
			this.isIncreasingPower = false
		}

		while (ns.gang.canRecruitMember()) {
			const newMember: GangMember | null = GangManager.recruitMember(ns)
			if (newMember) this.upgradeMember(ns, newMember)
			await ns.asleep(CONSTANT.SMALL_DELAY)
		}

		const members: GangMember[] = GangMember.getAllGangMembers(ns)

		if (GangManager.shouldReduceWantedLevel(ns)) {
			await this.reduceWantedLevel(ns, members)
		}

		const bestMember: GangMember     = GangManager.getBestMember(ns, members)
		const otherMembers: GangMember[] = members.filter((member) => member.name !== bestMember.name)

		this.manageBestMember(ns, bestMember)
		otherMembers.forEach((member) => this.manageMember(ns, member))
	}

	private async reduceWantedLevel(ns: NS, members: GangMember[]): Promise<void> {
		LogAPI.printLog(ns, `Reducing wanted level`)

		members.forEach((member) => {
			member.startTask(ns, GangTask.getWantedLevelReductionTask(ns, member))
		})

		while (!GangManager.hasMinimumWantedLevel(ns)) {
			await ns.asleep(LOOP_DELAY)
		}

		LogAPI.printLog(ns, `Finished reducing wanted level`)
	}

	private manageMember(ns: NS, member: GangMember): void {

		this.upgradeMember(ns, member)

		if (!GangManager.hasReachedCombatStatsLevel(ns, member, COMBAT_STAT_HIGH_THRESHOLD)) {
			return member.startTask(ns, GangTask.getTrainTask(ns))
		}

		if (this.isIncreasingPower) {
			return member.startTask(ns, GangTask.getTerritoryWarfareTask(ns))
		}

		const task: GangTask = (this.focusOnRespect) ? GangTask.getRespectTask(ns, member) : GangTask.getMoneyTask(ns, member)
		return member.startTask(ns, task)
	}

	private manageBestMember(ns: NS, member: GangMember): void {

		this.upgradeMember(ns, member)

		if (!GangManager.hasReachedCombatStatsLevel(ns, member, COMBAT_STAT_LOW_THRESHOLD)) {
			return member.startTask(ns, GangTask.getTrainTask(ns))
		}

		if (!GangManager.hasMaximumGangMembers(ns)) {
			return member.startTask(ns, GangTask.getRespectTask(ns, member))
		}

		if (!GangManager.hasReachedCombatStatsLevel(ns, member, COMBAT_STAT_HIGH_THRESHOLD)) {
			return member.startTask(ns, GangTask.getTrainTask(ns))
		}

		if (this.isIncreasingPower) {
			return member.startTask(ns, GangTask.getTerritoryWarfareTask(ns))
		}

		const task: GangTask = (this.focusOnRespect) ? GangTask.getRespectTask(ns, member) : GangTask.getMoneyTask(ns, member)
		return member.startTask(ns, task)
	}

	private upgradeMember(ns: NS, member: GangMember) {
		if (GangManager.shouldAscend(ns, member)) {
			member.ascend(ns)
		}

		let remainingUpgrades: GangUpgrade[] = this.upgrades.filter((upgrade) => !member.upgrades.some((memberUpgrade) => upgrade.name === memberUpgrade.name))
		                                           .filter((upgrade) => {
			                                           if (GangManager.isHackingGang(ns)) {
				                                           return upgrade.multipliers.hack || upgrade.multipliers.cha
			                                           } else {
				                                           return upgrade.multipliers.cha || upgrade.multipliers.agi || upgrade.multipliers.str || upgrade.multipliers.dex || upgrade.multipliers.agi || upgrade.multipliers.def
			                                           }
		                                           })

		remainingUpgrades = GangUpgrade.sortUpgrades(ns, remainingUpgrades)

		let numUpgrades: number = 0
		for (const upgrade of remainingUpgrades) {
			if (GangManager.canAfford(ns, upgrade)) {
				const isSuccessful: boolean = member.purchaseUpgrade(ns, upgrade)
				if (!isSuccessful) LogAPI.printLog(ns, `Could not successfully purchase ${upgrade.name}`)
				else numUpgrades++
			}
		}

		if (numUpgrades > 0) {
			LogAPI.printLog(ns, `Purchased ${numUpgrades} upgrades for ${member.name}`)
		}
	}
}

export async function main(ns: NS) {
	if (ns.getHostname() !== 'home') {
		throw new Error('Run the script from home')
	}

	const instance: GangManager = new GangManager()

	await instance.initialize(ns)
	await instance.start(ns)

	while (true) {
		await instance.managingLoop(ns)
		await ns.asleep(LOOP_DELAY)
	}
}