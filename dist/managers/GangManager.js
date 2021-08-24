import * as ControlFlowAPI from '/src/api/ControlFlowAPI.js';
import * as LogAPI from '/src/api/LogAPI.js';
import { LogType } from '/src/api/LogAPI.js';
import * as Utils from '/src/util/Utils.js';
import * as GangUtils from '/src/util/GangUtils.js';
import { CONSTANT } from '/src/lib/constants.js';
import GangMember from '/src/classes/Gang/GangMember.js';
import GangTask from '/src/classes/Gang/GangTask.js';
const MANAGING_LOOP_DELAY = 1000;
class GangManager {
    constructor() {
        this.members = [];
    }
    async initialize(ns) {
        Utils.disableLogging(ns);
        this.members = GangUtils.createGangMembers(ns);
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
        }
        this.managingLoopTimeout = setTimeout(this.managingLoop.bind(this, ns), MANAGING_LOOP_DELAY);
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
    if (!ns.gang.inGang()) {
        LogAPI.warn(ns, `Cannot start GangManager. Please join a gang first.`);
        return;
    }
    const instance = new GangManager();
    await instance.initialize(ns);
    await instance.start(ns);
    while (!ControlFlowAPI.hasManagerKillRequest(ns)) {
        await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL);
    }
    await instance.destroy(ns);
}
