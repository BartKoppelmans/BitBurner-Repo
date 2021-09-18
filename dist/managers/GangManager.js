import { hasManagerKillRequest } from '/src/api/ControlFlowAPI.js';
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
const LOOP_DELAY = 2000;
const CREATE_GANG_DELAY = 10000;
const ASCENSION_MULTIPLIER_THRESHOLD = 5;
const GANG_ALLOWANCE = 0.1;
const WANTED_PENALTY_THRESHOLD = 0.25; // Percentage
const COMBAT_STAT_HIGH_THRESHOLD = 2500;
const COMBAT_STAT_LOW_THRESHOLD = 250;
const MAX_GANG_MEMBERS = 12;
const CLASH_CHANCE_THRESHOLD = 0.99;
class GangManager {
    constructor() {
        this.focusOnRespect = false;
    }
    static getBestMember(ns, members) {
        const isHacking = GangUtils.isHackingGang(ns);
        // TODO: Perhaps modify this to use the optimal respect gain?
        // TODO: Add something to prevent it from constantly switching
        const evaluations = members.map((member) => {
            const stats = member.getGangMemberStats(ns);
            let score;
            if (isHacking)
                score = stats.hack + stats.cha;
            else
                score = stats.agi + stats.str + stats.dex + stats.def + stats.cha;
            score += member.getGangMemberInformation(ns).earnedRespect;
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
        const average = (gangMemberStats.str + gangMemberStats.agi + gangMemberStats.def + gangMemberStats.dex) / 4;
        return average > level;
    }
    static canWinTerritoryWarfare(ns, gangs) {
        return gangs.every((gang) => gang.getChanceToWinClash(ns) > CLASH_CHANCE_THRESHOLD);
    }
    static shouldReduceWantedLevel(ns) {
        // TODO: Make sure that this takes respect into account more
        // When respect and wanted are both (equally) low, we should gain more respect
        // Otherwise, perhaps consider not ascending the highest respect person
        const gangInformation = ns.gang.getGangInformation();
        const wantedPenalty = HomeGang.calculateWantedPenalty(ns, gangInformation);
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
            const hasCreatedGang = ns.gang.createGang('Slum Snakes');
            if (!hasCreatedGang)
                await ns.sleep(CREATE_GANG_DELAY);
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
    static removeFocusSwitch() {
        const doc = eval('document');
        const focusElement = doc.getElementById('gangFocusSwitchContainer');
        if (focusElement)
            focusElement.remove();
    }
    async initialize(ns) {
        Utils.disableLogging(ns);
        await GangManager.createGang(ns);
        this.upgrades = GangUpgrade.getAllUpgrades(ns);
        this.gangs = Gang.getGangs(ns);
        this.homeGang = HomeGang.getHomeGang(ns);
        // this.createFocusSwitch()
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
        // GangManager.removeFocusSwitch()
        LogAPI.debug(ns, `Stopping the GangManager`);
    }
    createFocusSwitch() {
        const doc = eval('document');
        const appendSwitch = () => {
            // ----- Create a Container -----
            const gangFocusSwitchContainer = doc.createElement('tr');
            gangFocusSwitchContainer.id = 'gangFocusSwitchContainer';
            gangFocusSwitchContainer.innerHTML =
                `<input id="focus-respect" type="checkbox" value="respect" class="optionCheckbox"/>` +
                    `<label for="focus-respect">Focus on respect</label>`;
            gangFocusSwitchContainer.addEventListener('change', (event) => {
                const target = event.target;
                this.focusOnRespect = target.checked;
            });
            // Append container to DOM
            // @ts-ignore
            const element = doc.getElementById('character-overview-text').firstChild.firstChild;
            if (element)
                element.appendChild(gangFocusSwitchContainer);
        };
        if (!doc.getElementById('gangFocusSwitchContainer'))
            appendSwitch();
    }
    async managingLoop(ns) {
        const doTerritoryWarfare = GangManager.canWinTerritoryWarfare(ns, this.gangs);
        doTerritoryWarfare ? this.homeGang.enableTerritoryWarfare(ns) : this.homeGang.disableTerritoryWarfare(ns);
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
        members.forEach((member) => {
            member.startTask(ns, GangTask.getWantedLevelReductionTask(ns, member));
        });
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
        if (!GangManager.canWinTerritoryWarfare(ns, this.gangs)) {
            return member.startTask(ns, GangTask.getTerritoryWarfareTask(ns));
        }
        const task = (this.focusOnRespect) ? GangTask.getRespectTask(ns, member) : GangTask.getMoneyTask(ns, member);
        return member.startTask(ns, task);
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
        if (!GangManager.canWinTerritoryWarfare(ns, this.gangs)) {
            return member.startTask(ns, GangTask.getTerritoryWarfareTask(ns));
        }
        const task = (this.focusOnRespect) ? GangTask.getRespectTask(ns, member) : GangTask.getMoneyTask(ns, member);
        return member.startTask(ns, task);
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
export async function main(ns) {
    if (ns.getHostname() !== 'home') {
        throw new Error('Run the script from home');
    }
    const instance = new GangManager();
    await instance.initialize(ns);
    await instance.start(ns);
    while (!hasManagerKillRequest(ns)) {
        await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL);
    }
    await instance.destroy(ns);
}
