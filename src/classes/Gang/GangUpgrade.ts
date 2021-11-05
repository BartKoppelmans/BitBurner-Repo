import type { NS }                                                  from 'Bitburner'
import { GangMemberInfo }                                           from 'Bitburner'
import { GangUpgradeMultipliers, GangUpgradeName, GangUpgradeType } from '/src/classes/Gang/GangInterfaces.js'

export default class GangUpgrade {

	name: GangUpgradeName
	cost: number
	type: GangUpgradeType
	multipliers: GangUpgradeMultipliers

	public constructor(ns: NS, name: GangUpgradeName) {
		this.name        = name
		this.cost        = ns.gang.getEquipmentCost(name)
		this.type        = ns.gang.getEquipmentType(name)
		this.multipliers = ns.gang.getEquipmentStats(name)
	}

	public static getAllUpgrades(ns: NS): GangUpgrade[] {
		const names: GangUpgradeName[] = ns.gang.getEquipmentNames()
		return names.map((name) => new GangUpgrade(ns, name))
	}

	public static getMemberUpgrades(ns: NS, memberName: string): GangUpgrade[] {
		const upgrades: GangUpgrade[] = this.getAllUpgrades(ns)

		const memberInformation: GangMemberInfo     = ns.gang.getMemberInformation(memberName)
		const memberUpgradeNames: GangUpgradeName[] = [...memberInformation.upgrades, ...memberInformation.augmentations]

		return upgrades.filter((upgrade) => memberUpgradeNames.includes(upgrade.name))
	}

	public static sortUpgrades(ns: NS, upgrades: GangUpgrade[]): GangUpgrade[] {
		let ordering: GangUpgradeType[]
		if (ns.gang.getGangInformation().isHacking) ordering = ['Augmentation', 'Rootkit', 'Vehicle', 'Weapon', 'Armor']
		else ordering = ['Augmentation', 'Weapon', 'Armor', 'Vehicle', 'Rootkit']

		return upgrades.sort((a, b) => b.cost - a.cost)
		               .sort((a, b) => ordering.indexOf(a.type) - ordering.indexOf(b.type))
	}
}