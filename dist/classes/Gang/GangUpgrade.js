export default class GangUpgrade {
    constructor(ns, name) {
        this.name = name;
        this.cost = ns.gang.getEquipmentCost(name);
        this.type = ns.gang.getEquipmentType(name);
        this.multipliers = ns.gang.getEquipmentStats(name);
    }
    static getAllUpgrades(ns) {
        const names = ns.gang.getEquipmentNames();
        return names.map((name) => new GangUpgrade(ns, name));
    }
    static getMemberUpgrades(ns, memberName) {
        const upgrades = this.getAllUpgrades(ns);
        const memberInformation = ns.gang.getMemberInformation(memberName);
        const memberUpgradeNames = [...memberInformation.upgrades, ...memberInformation.augmentations];
        return upgrades.filter((upgrade) => memberUpgradeNames.includes(upgrade.name));
    }
    static sortUpgrades(ns, upgrades) {
        let ordering;
        if (ns.gang.getGangInformation().isHacking)
            ordering = ['Augmentation', 'Rootkit', 'Vehicle', 'Weapon', 'Armor'];
        else
            ordering = ['Augmentation', 'Weapon', 'Armor', 'Vehicle', 'Rootkit'];
        return upgrades.sort((a, b) => b.cost - a.cost)
            .sort((a, b) => ordering.indexOf(a.type) - ordering.indexOf(b.type));
    }
}
