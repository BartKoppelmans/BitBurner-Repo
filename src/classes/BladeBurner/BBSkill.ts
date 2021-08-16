import { BBSkillName, BBSkillPriority } from '/src/classes/BladeBurner/BBInterfaces.js'
import { BitBurner as NS }              from 'Bitburner'

export class BBSkill {
	name: BBSkillName

	priority: BBSkillPriority

	// TODO: Include some prioritization for skills

	public constructor(ns: NS, name: BBSkillName) {
		this.name = name

		this.priority = BBSkill.determinePriority(this.name)
	}

	private static determinePriority(name: BBSkillName): BBSkillPriority {
		switch (name) {
			case 'Overclock':
			case 'Blade\'s Intuition':
				return BBSkillPriority.HIGH
			case 'Cloak':
			case 'Short-Circuit':
			case 'Digital Observer':
				return BBSkillPriority.MEDIUM
			case 'Marksman':
			case 'Weapon Proficiency':
			case 'Tracer':
			case 'Reaper':
			case 'Evasive System':
			case 'Datamancer':
			case 'Cyber\'s Edge':
			case 'Hands of Midas':
			case 'Hyperdrive':
			default:
				return BBSkillPriority.LOW
		}
	}

	public getCost(ns: NS): number {
		return ns.bladeburner.getSkillUpgradeCost(this.name)
	}

	public getLevel(ns: NS): number {
		return ns.bladeburner.getSkillLevel(this.name)
	}

	public canUpgrade(ns: NS): boolean {
		if (this.name === 'Overclock' && this.getLevel(ns) === 90) return false
		return this.getCost(ns) <= ns.bladeburner.getSkillPoints()
	}

	public upgrade(ns: NS): void {
		if (!this.canUpgrade(ns)) throw new Error('Cannot upgrade this skill')
		else ns.bladeburner.upgradeSkill(this.name)
	}
}