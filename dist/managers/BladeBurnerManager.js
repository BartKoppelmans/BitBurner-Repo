import * as ControlFlowAPI from '/src/api/ControlFlowAPI.js';
import * as LogAPI from '/src/api/LogAPI.js';
import { LogType } from '/src/api/LogAPI.js';
import * as Utils from '/src/util/Utils.js';
import { CONSTANT } from '/src/lib/constants.js';
import * as BladeBurnerUtils from '/src/util/BladeBurnerUtils.js';
import * as PlayerUtils from '/src/util/PlayerUtils.js';
import { BBSkillPriority } from '/src/classes/BladeBurner/BBInterfaces.js';
const JOIN_DELAY = 60000;
const MANAGING_LOOP_DELAY = 100;
const BUSY_RETRY_DELAY = 1000;
const SYNTH_THRESHOLD = 100000;
const FIELD_ANALYSIS_INTERVAL = 75;
const FIELD_ANALYSIS_ITERATIONS = 25;
class BladeBurnerManager {
    constructor() {
        this.iterationCounter = 0;
    }
    static getStaminaPercentage(ns) {
        const [current, total] = ns.bladeburner.getStamina();
        return (current / total) * 100;
    }
    static isTired(ns) {
        return BladeBurnerManager.getStaminaPercentage(ns) <= 50;
    }
    static shouldTrain(ns) {
        const player = PlayerUtils.getPlayer(ns);
        return ns.bladeburner.getRank() > 1000 ||
            player.agility < 100 ||
            player.defense < 100 ||
            player.dexterity < 100 ||
            player.strength < 100;
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
    async managingLoop(ns) {
        const nextLoop = (isIteration) => {
            if (isIteration)
                this.iterationCounter++;
            this.managingLoopTimeout = setTimeout(this.managingLoop.bind(this, ns), MANAGING_LOOP_DELAY);
            return;
        };
        const iteration = (this.iterationCounter % (FIELD_ANALYSIS_INTERVAL + FIELD_ANALYSIS_ITERATIONS)) + 1;
        this.upgradeSkills(ns);
        // NOTE: This might still have some problems
        if (!BladeBurnerManager.hasSimulacrum(ns) && ns.isBusy()) {
            await ns.sleep(BUSY_RETRY_DELAY);
            return nextLoop(false);
        }
        // We start our regen if we are tired
        if (BladeBurnerManager.isTired(ns)) {
            const regenAction = BladeBurnerUtils.getAction(ns, this.actions, 'Hyperbolic Regeneration Chamber');
            return regenAction.execute(ns, iteration).then(nextLoop.bind(this, false));
        }
        // Check whether we have enough Synths, otherwise move or search for new ones
        const currentCity = this.cities.find((city) => city.isCurrent(ns));
        if (currentCity.getPopulation(ns) < SYNTH_THRESHOLD) {
            this.cities = this.cities.sort((a, b) => {
                return b.getPopulation(ns) - a.getPopulation(ns);
            });
            if (this.cities[0].name !== currentCity.name)
                this.cities[0].moveTo(ns);
            else {
                const intelActions = BladeBurnerUtils.getAchievableIntelActions(ns, this.actions);
                if (intelActions.length > 0) {
                    return intelActions[0].execute(ns, iteration).then(nextLoop.bind(this, true));
                }
                const fieldAnalysisAction = BladeBurnerUtils.getAction(ns, this.actions, 'Field Analysis');
                return fieldAnalysisAction.execute(ns, iteration).then(nextLoop.bind(this, false));
            }
        }
        const currentAction = this.getCurrentAction(ns);
        const nextAction = this.findOptimalAction(ns);
        // This makes sure that we don't unnecessarily stop our current action to start the same one
        if (currentAction && currentAction.name === nextAction.name) {
            return nextAction.continue(ns, iteration).then(nextLoop.bind(this, true));
        }
        else
            return nextAction.execute(ns, iteration).then(nextLoop.bind(this, true));
    }
    getCurrentAction(ns) {
        const currentAction = ns.bladeburner.getCurrentAction();
        if (currentAction.type === 'Idle')
            return undefined;
        return BladeBurnerUtils.getAction(ns, this.actions, currentAction.name);
    }
    findOptimalAction(ns) {
        const currentCity = this.cities.find((city) => city.isCurrent(ns));
        const shouldDoFieldAnalysis = ((this.iterationCounter % (FIELD_ANALYSIS_INTERVAL + FIELD_ANALYSIS_ITERATIONS)) < FIELD_ANALYSIS_ITERATIONS);
        if (shouldDoFieldAnalysis)
            return BladeBurnerUtils.getAction(ns, this.actions, 'Field Analysis');
        // We try to do the next BlackOp if possible
        const achievableBlackOps = BladeBurnerUtils.getAchievableBlackOps(ns, this.actions);
        if (achievableBlackOps.length > 0) {
            return achievableBlackOps[0];
        }
        // We try to do operations if possible
        const achievableOperations = BladeBurnerUtils.getAchievableActions(ns, this.actions, 'operations');
        if (achievableOperations.length > 0) {
            return achievableOperations[0];
        }
        // We try to do contracts if possible
        const achievableContracts = BladeBurnerUtils.getAchievableActions(ns, this.actions, 'contracts');
        if (achievableContracts.length > 0) {
            return achievableContracts[0];
        }
        // NOTE: Now we have figured out that there is basically nothing to do...
        if (currentCity.getChaos(ns) > ns.bladeburner.getRank() * 1000) {
            return BladeBurnerUtils.getAction(ns, this.actions, 'Diplomacy');
        }
        // Check whether we should train more
        if (BladeBurnerManager.shouldTrain(ns)) {
            return BladeBurnerUtils.getAction(ns, this.actions, 'Training');
        }
        // Our final resort is to just do some analyses
        return BladeBurnerUtils.getAction(ns, this.actions, 'Field Analysis');
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
    while (true) {
        const shouldKill = await ControlFlowAPI.hasManagerKillRequest(ns);
        if (shouldKill) {
            await instance.destroy(ns);
            ns.exit();
            return;
        }
        await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL);
    }
}
