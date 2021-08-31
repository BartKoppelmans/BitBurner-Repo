import * as ControlFlowAPI from '/src/api/ControlFlowAPI.js';
import * as LogAPI from '/src/api/LogAPI.js';
import { LogType } from '/src/api/LogAPI.js';
import * as Utils from '/src/util/Utils.js';
import * as GangUtils from '/src/util/GangUtils.js';
import { CONSTANT } from '/src/lib/constants.js';
import GangMember from '/src/classes/Gang/GangMember.js';
import GangTask from '/src/classes/Gang/GangTask.js';
import GangUpgrade from '/src/classes/Gang/GangUpgrade.js';
import * as PlayerUtils from '/src/util/PlayerUtils.js';
import HomeGang from '/src/classes/Gang/HomeGang.js';
import Gang from '/src/classes/Gang/Gang.js';
const LOOP_DELAY = 10000;
const CREATE_GANG_DELAY = 10000;
const ASCENSION_MULTIPLIER_THRESHOLD = 5;
const GANG_ALLOWANCE = 0.1;
const WANTED_PENALTY_THRESHOLD = 0.25; // Percentage
const COMBAT_STAT_HIGH_THRESHOLD = 1000;
const COMBAT_STAT_LOW_THRESHOLD = 100;
const MAX_GANG_MEMBERS = 12;
class GangManager {
    constructor() {
        this.isReducingWantedLevel = false;
    }
    static getBestMember(ns, members) {
        const isHacking = GangUtils.isHackingGang(ns);
        // TODO: Update this to take the current skill points and respect into account
        const evaluations = members.map((member) => {
            const ascensionPoints = member.getCurrentAscensionPoints(ns);
            let score;
            if (isHacking)
                score = ascensionPoints.hack + ascensionPoints.cha;
            else
                score = ascensionPoints.agi + ascensionPoints.str + ascensionPoints.dex + ascensionPoints.def + ascensionPoints.cha;
            return { member, score };
        }).sort((a, b) => b.score - a.score);
        return evaluations[0].member;
    }
    static getNumMembers(ns) {
        return ns.gang.getMemberNames().length;
    }
    // TODO: Move this to the gang manager
    static hasMaximumGangMembers(ns) {
        return GangManager.getNumMembers(ns) >= MAX_GANG_MEMBERS;
    }
    static hasReachedCombatStatsLevel(ns, member, level) {
        const gangMemberStats = member.getGangMemberStats(ns);
        let hasReached = true;
        for (const [key, value] of Object.entries(gangMemberStats)) {
            if (key !== 'cha' && key !== 'hack') {
                hasReached = hasReached && (value >= level);
            }
        }
        return hasReached;
    }
    static shouldDoTerritoryWarfare(ns, homeGang, gangs) {
        // TODO: Actually calculate this
        return true;
    }
    static shouldReduceWantedLevel(ns) {
        const gangInformation = ns.gang.getGangInformation();
        const wantedPenalty = (gangInformation.respect) / (gangInformation.respect + gangInformation.wantedLevel);
        return (wantedPenalty <= WANTED_PENALTY_THRESHOLD);
    }
    static hasMinimumWantedLevel(ns) {
        const gangInformation = ns.gang.getGangInformation();
        return (gangInformation.wantedLevel === 1);
    }
    static async createGang(ns) {
        while (!ns.gang.inGang()) {
            const factions = ns.getPlayer().factions;
            if (!factions.includes('Slum Snakes')) {
                const invitations = ns.checkFactionInvitations();
                if (!invitations.includes('Slum Snakes')) {
                    await ns.sleep(CREATE_GANG_DELAY);
                    continue;
                }
                ns.joinFaction('Slum Snakes');
            }
            ns.gang.createGang('Slum Snakes');
        }
    }
    static shouldAscend(ns, member) {
        const ascensionResults = member.getAscensionResults(ns);
        return ascensionResults.hack * ascensionResults.str * ascensionResults.def * ascensionResults.dex * ascensionResults.agi * ascensionResults.cha >= ASCENSION_MULTIPLIER_THRESHOLD;
    }
    static canAfford(ns, upgrade) {
        const money = PlayerUtils.getMoney(ns) * GANG_ALLOWANCE;
        return upgrade.cost <= money;
    }
    static recruitMember(ns) {
        const name = GangUtils.generateName(ns);
        const isSuccessful = ns.gang.recruitMember(name);
        if (!isSuccessful) {
            LogAPI.warn(ns, `Failed to recruit a new member`);
            return null;
        }
        else
            LogAPI.log(ns, `Recruited new gang member '${name}'`, LogType.GANG);
        return new GangMember(ns, name);
    }
    async initialize(ns) {
        Utils.disableLogging(ns);
        await GangManager.createGang(ns);
        this.upgrades = GangUpgrade.getAllUpgrades(ns);
        this.gangs = Gang.getGangs(ns);
        this.homeGang = HomeGang.getHomeGang(ns);
    }
    async start(ns) {
        LogAPI.debug(ns, `Starting the GangManager`);
        this.managingLoopTimeout = setTimeout(this.managingLoop.bind(this, ns), LOOP_DELAY);
    }
    async destroy(ns) {
        if (this.managingLoopTimeout)
            clearTimeout(this.managingLoopTimeout);
        const members = GangMember.getAllGangMembers(ns);
        members.forEach((member) => member.startTask(ns, GangTask.getUnassignedTask(ns)));
        LogAPI.debug(ns, `Stopping the GangManager`);
    }
    async managingLoop(ns) {
        while (ns.gang.canRecruitMember()) {
            const newMember = GangManager.recruitMember(ns);
            if (newMember)
                this.upgradeMember(ns, newMember);
            await ns.sleep(CONSTANT.SMALL_DELAY);
        }
        const members = GangMember.getAllGangMembers(ns);
        if (GangManager.shouldReduceWantedLevel(ns)) {
            await this.reduceWantedLevel(ns, members);
        }
        const bestMember = GangManager.getBestMember(ns, members);
        const otherMembers = members.filter((member) => member.name !== bestMember.name);
        this.manageBestMember(ns, bestMember);
        otherMembers.forEach((member) => this.manageMember(ns, member));
        this.managingLoopTimeout = setTimeout(this.managingLoop.bind(this, ns), LOOP_DELAY);
    }
    async reduceWantedLevel(ns, members) {
        LogAPI.log(ns, `Reducing wanted level`, LogType.GANG);
        const reductionTask = GangTask.getTask(ns, 'Vigilante Justice');
        members.forEach((member) => member.startTask(ns, reductionTask));
        while (!GangManager.hasMinimumWantedLevel(ns)) {
            await ns.sleep(LOOP_DELAY);
        }
        LogAPI.log(ns, `Finished reducing wanted level`, LogType.GANG);
    }
    manageMember(ns, member) {
        this.upgradeMember(ns, member);
        if (!GangManager.hasReachedCombatStatsLevel(ns, member, COMBAT_STAT_HIGH_THRESHOLD)) {
            return member.startTask(ns, GangTask.getTrainTask(ns));
        }
        if (GangManager.shouldDoTerritoryWarfare(ns, this.homeGang, this.gangs)) {
            return member.startTask(ns, GangTask.getTerritoryWarfareTask(ns));
        }
        return member.startTask(ns, GangTask.getMoneyTask(ns));
    }
    manageBestMember(ns, member) {
        this.upgradeMember(ns, member);
        if (!GangManager.hasReachedCombatStatsLevel(ns, member, COMBAT_STAT_LOW_THRESHOLD)) {
            return member.startTask(ns, GangTask.getTrainTask(ns));
        }
        if (!GangManager.hasMaximumGangMembers(ns)) {
            return member.startTask(ns, GangTask.getRespectTask(ns, member));
        }
        if (!GangManager.hasReachedCombatStatsLevel(ns, member, COMBAT_STAT_HIGH_THRESHOLD)) {
            return member.startTask(ns, GangTask.getTrainTask(ns));
        }
        if (GangManager.shouldDoTerritoryWarfare(ns, this.homeGang, this.gangs)) {
            return member.startTask(ns, GangTask.getTerritoryWarfareTask(ns));
        }
        return member.startTask(ns, GangTask.getMoneyTask(ns));
    }
    upgradeMember(ns, member) {
        if (GangManager.shouldAscend(ns, member)) {
            member.ascend(ns);
        }
        let remainingUpgrades = this.upgrades.filter((upgrade) => !member.upgrades.some((memberUpgrade) => upgrade.name === memberUpgrade.name));
        remainingUpgrades = GangUpgrade.sortUpgrades(ns, remainingUpgrades);
        let numUpgrades = 0;
        for (const upgrade of remainingUpgrades) {
            if (GangManager.canAfford(ns, upgrade)) {
                const isSuccessful = member.purchaseUpgrade(ns, upgrade);
                if (!isSuccessful)
                    LogAPI.warn(ns, `Could not successfully purchase ${upgrade.name}`);
                else
                    numUpgrades++;
            }
        }
        if (numUpgrades > 0) {
            LogAPI.log(ns, `Purchased ${numUpgrades} upgrades for ${member.name}`, LogType.GANG);
        }
    }
}
export async function start(ns) {
    if (isRunning(ns))
        return;
    // TODO: Check whether there is enough ram available
    ns.exec('/src/managers/GangManager.js', CONSTANT.HOME_SERVER_HOST);
    while (!isRunning(ns)) {
        await ns.sleep(CONSTANT.SMALL_DELAY);
    }
}
export function isRunning(ns) {
    return ns.isRunning('/src/managers/GangManager.js', CONSTANT.HOME_SERVER_HOST);
}
export async function main(ns) {
    if (ns.getHostname() !== 'home') {
        throw new Error('Run the script from home');
    }
    const instance = new GangManager();
    await instance.initialize(ns);
    await instance.start(ns);
    while (!ControlFlowAPI.hasManagerKillRequest(ns)) {
        await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL);
    }
    await instance.destroy(ns);
}
