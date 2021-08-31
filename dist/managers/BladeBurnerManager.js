import * as ControlFlowAPI from '/src/api/ControlFlowAPI.js';
import * as LogAPI from '/src/api/LogAPI.js';
import { LogType } from '/src/api/LogAPI.js';
import * as Utils from '/src/util/Utils.js';
import { CONSTANT } from '/src/lib/constants.js';
import * as BladeBurnerUtils from '/src/util/BladeBurnerUtils.js';
import * as PlayerUtils from '/src/util/PlayerUtils.js';
import { BBSkillPriority } from '/src/classes/BladeBurner/BBInterfaces.js';
const MONEY_THRESHOLD = 1e9; // 1 billion
const JOIN_DELAY = 60000;
const MANAGING_LOOP_DELAY = 100;
const BUSY_RETRY_DELAY = 1000;
const SYNTH_POPULATION_THRESHOLD = 1e8;
const SYNTH_COMMUNITY_THRESHOLD = 5;
const CHAOS_THRESHOLD = 100;
const FINAL_BLACK_OP_WARNING_INTERVAL = 10;
class BladeBurnerManager {
    constructor() {
        this.iterationCounter = 1;
    }
    static getStaminaPercentage(ns) {
        const [current, total] = ns.bladeburner.getStamina();
        return (current / total) * 100;
    }
    static isTired(ns) {
        return BladeBurnerManager.getStaminaPercentage(ns) <= 50;
    }
    static shouldMove(ns, currentCity) {
        return currentCity.getPopulation(ns) < SYNTH_POPULATION_THRESHOLD;
    }
    static shouldTrain(ns) {
        const player = PlayerUtils.getPlayer(ns);
        return ns.bladeburner.getRank() > 1000 && (player.agility < 100 ||
            player.defense < 100 ||
            player.dexterity < 100 ||
            player.strength < 100);
    }
    static shouldAnalyze(ns, actions) {
        return actions.some((action) => {
            const chance = action.getChance(ns);
            return (chance.upper !== chance.lower);
        });
    }
    static hasSimulacrum(ns) {
        const augs = ns.getOwnedAugmentations();
        return augs.includes('The Blade\'s Simulacrum');
    }
    async initialize(ns) {
        Utils.disableLogging(ns);
        while (!ns.bladeburner.joinBladeburnerDivision()) {
            LogAPI.log(ns, `Waiting to join BladeBurner Division`, LogType.BLADEBURNER);
            await ns.sleep(JOIN_DELAY);
        }
        this.actions = BladeBurnerUtils.createActions(ns);
        this.skills = BladeBurnerUtils.createSkills(ns);
        this.cities = BladeBurnerUtils.createCities(ns);
    }
    async start(ns) {
        LogAPI.debug(ns, `Starting the BladeBurnerManager`);
        this.managingLoopTimeout = setTimeout(this.managingLoop.bind(this, ns), MANAGING_LOOP_DELAY);
    }
    async destroy(ns) {
        if (this.managingLoopTimeout)
            clearTimeout(this.managingLoopTimeout);
        ns.bladeburner.stopBladeburnerAction();
        LogAPI.debug(ns, `Stopping the BladeBurnerManager`);
    }
    shouldPreferContracts(ns) {
        return this.canFinishBitNode(ns) || PlayerUtils.getMoney(ns) < MONEY_THRESHOLD;
    }
    canFinishBitNode(ns) {
        // We try to do the next BlackOp if possible
        const achievableBlackOps = BladeBurnerUtils.getAchievableBlackOps(ns, this.actions);
        if (achievableBlackOps.length > 0) {
            const nextBlackOp = achievableBlackOps[0];
            if (nextBlackOp.name === 'Operation Daedalus')
                return true;
        }
        return false;
    }
    async managingLoop(ns) {
        const nextLoop = (isIteration) => {
            if (isIteration)
                this.iterationCounter++;
            this.managingLoopTimeout = setTimeout(this.managingLoop.bind(this, ns), MANAGING_LOOP_DELAY);
            return;
        };
        this.upgradeSkills(ns);
        // NOTE: This might still have some problems
        if (!BladeBurnerManager.hasSimulacrum(ns) && ns.isBusy()) {
            await ns.sleep(BUSY_RETRY_DELAY);
            return nextLoop(false);
        }
        if (this.canFinishBitNode(ns) && ((this.iterationCounter) % FINAL_BLACK_OP_WARNING_INTERVAL === 0)) {
            LogAPI.warn(ns, `We are ready to finish the final BlackOp`);
        }
        // We start our regen if we are tired
        if (BladeBurnerManager.isTired(ns)) {
            const regenAction = BladeBurnerUtils.getAction(ns, this.actions, 'Hyperbolic Regeneration Chamber');
            return regenAction.execute(ns, this.iterationCounter).then(nextLoop.bind(this, false));
        }
        // Check whether we have enough Synths, otherwise move or search for new ones
        const currentCity = this.cities.find((city) => city.isCurrent(ns));
        if (BladeBurnerManager.shouldMove(ns, currentCity)) {
            const cities = this.cities
                .sort((a, b) => {
                return b.getPopulation(ns) - a.getPopulation(ns);
            });
            if (this.cities[0].name !== currentCity.name)
                this.cities[0].moveTo(ns);
        }
        const currentAction = this.getCurrentAction(ns);
        const nextAction = this.findOptimalAction(ns);
        // This makes sure that we don't unnecessarily stop our current action to start the same one
        if (currentAction && currentAction.name === nextAction.name) {
            return nextAction.continue(ns, this.iterationCounter).then(nextLoop.bind(this, true));
        }
        else
            return nextAction.execute(ns, this.iterationCounter).then(nextLoop.bind(this, true));
    }
    getCurrentAction(ns) {
        const currentAction = ns.bladeburner.getCurrentAction();
        if (currentAction.type === 'Idle')
            return undefined;
        return BladeBurnerUtils.getAction(ns, this.actions, currentAction.name);
    }
    findOptimalAction(ns) {
        const currentCity = this.cities.find((city) => city.isCurrent(ns));
        if (BladeBurnerManager.shouldAnalyze(ns, this.actions))
            return BladeBurnerUtils.getAction(ns, this.actions, 'Field Analysis');
        // NOTE: Now we have figured out that there is basically nothing to do...
        if (currentCity.getChaos(ns) > CHAOS_THRESHOLD) {
            return BladeBurnerUtils.getAction(ns, this.actions, 'Diplomacy');
        }
        // Check whether we should train more
        if (BladeBurnerManager.shouldTrain(ns)) {
            return BladeBurnerUtils.getAction(ns, this.actions, 'Training');
        }
        // We try to do the next BlackOp if possible
        const achievableBlackOps = BladeBurnerUtils.getAchievableBlackOps(ns, this.actions);
        if (achievableBlackOps.length > 0) {
            const nextBlackOp = achievableBlackOps[0];
            if (nextBlackOp.name !== 'Operation Daedalus')
                return nextBlackOp;
        }
        // We try to do operations if possible
        const achievableOperations = BladeBurnerUtils.getAchievableActions(ns, this.actions, 'operations');
        const achievableContracts = BladeBurnerUtils.getAchievableActions(ns, this.actions, 'contracts');
        // If we have little money, prefer contracts over operations
        if (achievableOperations.length > 0 && achievableContracts.length > 0) {
            return (this.shouldPreferContracts(ns)) ? achievableContracts[0] : achievableOperations[0];
        }
        // Otherwise, do whatever we can
        if (achievableOperations.length > 0) {
            return achievableOperations[0];
        }
        // We try to do contracts if possible
        if (achievableContracts.length > 0) {
            return achievableContracts[0];
        }
        // Our final resort is to just do some training
        return BladeBurnerUtils.getAction(ns, this.actions, 'Training');
    }
    upgradeSkills(ns) {
        const highPrioritySkills = BladeBurnerUtils.filterSkills(ns, this.skills, BBSkillPriority.HIGH);
        const mediumPrioritySkills = BladeBurnerUtils.filterSkills(ns, this.skills, BBSkillPriority.MEDIUM);
        const lowPrioritySkills = BladeBurnerUtils.filterSkills(ns, this.skills, BBSkillPriority.LOW);
        const skillSets = [highPrioritySkills, mediumPrioritySkills, lowPrioritySkills];
        const upgradedSkills = [];
        for (const skillSet of skillSets) {
            let hasUpgraded;
            do {
                hasUpgraded = false;
                for (const skill of skillSet) {
                    if (skill.canUpgrade(ns)) {
                        skill.upgrade(ns);
                        const index = upgradedSkills.findIndex((upgradedSkill) => upgradedSkill.name === skill.name);
                        if (index === -1)
                            upgradedSkills.push(skill);
                        hasUpgraded = true;
                    }
                }
            } while (hasUpgraded);
        }
        upgradedSkills.forEach((skill) => LogAPI.log(ns, `Upgraded skill '${skill.name}' to level ${skill.getLevel(ns)}`, LogType.BLADEBURNER));
    }
}
export async function start(ns) {
    if (isRunning(ns))
        return;
    // TODO: Check whether there is enough ram available
    ns.exec('/src/managers/BladeBurnerManager.js', CONSTANT.HOME_SERVER_HOST);
    while (!isRunning(ns)) {
        await ns.sleep(CONSTANT.SMALL_DELAY);
    }
}
export function isRunning(ns) {
    return ns.isRunning('/src/managers/BladeBurnerManager.js', CONSTANT.HOME_SERVER_HOST);
}
export async function main(ns) {
    if (ns.getHostname() !== 'home') {
        throw new Error('Run the script from home');
    }
    const instance = new BladeBurnerManager();
    await instance.initialize(ns);
    await instance.start(ns);
    while (!ControlFlowAPI.hasManagerKillRequest(ns)) {
        await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL);
    }
    await instance.destroy(ns);
}
