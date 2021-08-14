import { BBSkillPriority } from '/src/classes/BladeBurner/BBInterfaces.js';
export class BBSkill {
    // TODO: Include some prioritization for skills
    constructor(ns, name) {
        this.name = name;
        this.priority = BBSkill.determinePriority(this.name);
    }
    getCost(ns) {
        return ns.bladeburner.getSkillUpgradeCost(this.name);
    }
    getLevel(ns) {
        return ns.bladeburner.getSkillLevel(this.name);
    }
    canUpgrade(ns) {
        if (this.name === 'Overclock' && this.getLevel(ns) === 90)
            return false;
        return this.getCost(ns) <= ns.bladeburner.getSkillPoints();
    }
    upgrade(ns) {
        if (!this.canUpgrade(ns))
            throw new Error('Cannot upgrade this skill');
        else
            ns.bladeburner.upgradeSkill(this.name);
    }
    static determinePriority(name) {
        switch (name) {
            case 'Overclock':
            case 'Blade\'s Intuition':
                return BBSkillPriority.HIGH;
            case 'Cloak':
            case 'Short-Circuit':
            case 'Digital Observer':
                return BBSkillPriority.MEDIUM;
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
                return BBSkillPriority.LOW;
        }
    }
}
