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
const MANAGING_LOOP_DELAY = 1000;
const CREATE_GANG_DELAY = 10000;
const ASCENSION_MULTIPLIER_THRESHOLD = 2;
const GANG_ALLOWANCE = 0.1;
class GangManager {
    constructor() {
        this.members = [];
        this.upgrades = [];
    }
    async initialize(ns) {
        Utils.disableLogging(ns);
        await GangManager.createGang(ns);
        this.members = GangMember.getAllGangMembers(ns);
        this.upgrades = GangUpgrade.getAllUpgrades(ns);
    }
    async start(ns) {
        LogAPI.debug(ns, `Starting the GangManager`);
        this.managingLoopTimeout = setTimeout(this.managingLoop.bind(this, ns), MANAGING_LOOP_DELAY);
    }
    async destroy(ns) {
        if (this.managingLoopTimeout)
            clearTimeout(this.managingLoopTimeout);
        LogAPI.debug(ns, `Stopping the GangManager`);
    }
    async managingLoop(ns) {
        while (ns.gang.canRecruitMember()) {
            this.recruitMember(ns);
            await ns.sleep(CONSTANT.SMALL_DELAY);
        }
        this.members.forEach((member) => this.manageMember(ns, member));
        this.managingLoopTimeout = setTimeout(this.managingLoop.bind(this, ns), MANAGING_LOOP_DELAY);
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
    manageMember(ns, member) {
        if (GangManager.shouldAscend(ns, member)) {
            member.ascend(ns);
        }
        let remainingUpgrades = this.upgrades.filter((upgrade) => !member.upgrades.some((memberUpgrade) => upgrade.name === memberUpgrade.name));
        remainingUpgrades = GangUpgrade.sortUpgrades(ns, remainingUpgrades);
        for (const upgrade of remainingUpgrades) {
            if (GangManager.canAfford(ns, upgrade)) {
                member.purchaseUpgrade(ns, upgrade);
            }
        }
        // TODO: Assign tasks
    }
    static shouldAscend(ns, member) {
        const ascensionResults = member.getAscensionResults(ns);
        return ascensionResults.hack * ascensionResults.str * ascensionResults.def * ascensionResults.dex * ascensionResults.agi * ascensionResults.cha >= ASCENSION_MULTIPLIER_THRESHOLD;
    }
    static canAfford(ns, upgrade) {
        const money = PlayerUtils.getMoney(ns) * GANG_ALLOWANCE;
        return upgrade.cost <= money;
    }
    recruitMember(ns) {
        const name = GangUtils.generateName(ns);
        const isSuccessful = ns.gang.recruitMember(name);
        if (!isSuccessful) {
            LogAPI.warn(ns, `Failed to recruit a new member`);
            return;
        }
        else
            LogAPI.log(ns, `Recruited new gang member '${name}'`, LogType.GANG);
        const member = new GangMember(ns, name);
        member.startTask(ns, new GangTask(ns, 'Ransomware'));
        this.members.push(member);
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
