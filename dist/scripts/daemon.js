import * as LogAPI from '/src/api/LogAPI.js';
import { CONSTANT } from '/src/lib/constants.js';
import * as Utils from '/src/util/Utils.js';
import { Managers } from '/src/managers/Managers.js';
import * as ServerAPI from '/src/api/ServerAPI.js';
const RUNNER_INTERVAL = 60000;
const MANAGER_START_DELAY = 50;
async function initialize(ns) {
    Utils.disableLogging(ns);
    ns.atExit(destroy.bind(null, ns));
    const flags = ns.flags([
        ['hacking', false],
        ['bladeburner', false],
        ['gang', false],
        ['sleeve', false],
        ['stanek', false],
        ['stock', false],
        ['corporation', false],
        ['hacknet', false],
        ['auto', false],
    ]);
    await ServerAPI.initializeServerMap(ns);
    const tasks = [];
    if (flags.auto) {
        tasks.push(startManager(ns, Managers.HackingManager));
        tasks.push(startManager(ns, Managers.StanekManager));
        // The hacknet flag should be set, as it often is not needed as much
        if (flags.hacknet)
            tasks.push(startManager(ns, Managers.HacknetManager));
        const player = ns.getPlayer();
        if (ns.bladeburner.joinBladeburnerDivision())
            tasks.push(startManager(ns, Managers.BladeBurnerManager));
        if (ns.gang.inGang())
            tasks.push(startManager(ns, Managers.GangManager));
        if (ns.sleeve.getNumSleeves() > 0)
            tasks.push(startManager(ns, Managers.SleeveManager));
        if (player.hasWseAccount)
            tasks.push(startManager(ns, Managers.StockManager));
    }
    else {
        // Managers
        if (flags.hacking)
            tasks.push(startManager(ns, Managers.HackingManager));
        if (flags.bladeburner)
            tasks.push(startManager(ns, Managers.BladeBurnerManager));
        if (flags.gang)
            tasks.push(startManager(ns, Managers.GangManager));
        if (flags.sleeve)
            tasks.push(startManager(ns, Managers.SleeveManager));
        if (flags.stock)
            tasks.push(startManager(ns, Managers.StockManager));
        if (flags.hacknet)
            tasks.push(startManager(ns, Managers.HacknetManager));
        if (flags.stanek)
            tasks.push(startManager(ns, Managers.StanekManager));
        // NOTE: Removed this because it costs too much RAM
        // if (flags.corporation) tasks.push(startManager(ns, Managers.CorporationManager))
    }
    // Runners
    tasks.push(launchRunners(ns));
    await Promise.allSettled(tasks);
}
async function launchRunners(ns) {
    const purchasedServerRunner = launchRunner(ns, '/src/runners/PurchasedServerRunner.js');
    const programRunner = launchRunner(ns, '/src/runners/ProgramRunner.js');
    const codingContractRunner = launchRunner(ns, '/src/runners/CodingContractRunner.js');
    await Promise.allSettled([purchasedServerRunner, programRunner, codingContractRunner]);
}
async function launchRunner(ns, script) {
    // TODO: Check if we have enough ram available to run
    const pid = ns.run(script);
    if (pid !== -1) {
        const scriptNamePattern = /\/src\/runners\/(\w+)\.js/;
        const match = script.match(scriptNamePattern);
        if (!match)
            throw new Error('Could not get the name of the script');
        LogAPI.printLog(ns, `Running the ${match[1]}`);
    }
    while (ns.isRunning(pid)) {
        await ns.asleep(CONSTANT.SMALL_DELAY);
    }
}
function destroy(ns) {
    LogAPI.printTerminal(ns, 'Stopping the daemon');
}
export async function startManager(ns, manager) {
    if (isManagerRunning(ns, manager))
        return;
    // TODO: Check whether there is enough ram available
    ns.exec(manager, CONSTANT.HOME_SERVER_HOST);
    while (!isManagerRunning(ns, manager)) {
        await ns.asleep(MANAGER_START_DELAY);
    }
}
export function isManagerRunning(ns, manager) {
    return ns.isRunning(manager, CONSTANT.HOME_SERVER_HOST);
}
export async function main(ns) {
    const hostName = ns.getHostname();
    if (hostName !== 'home') {
        throw new Error('Execute daemon script from home.');
    }
    // TODO: Make a decision on whether we start the to-be-made early hacking scripts,
    // or whether we want to start hacking using our main hacker
    await initialize(ns);
    LogAPI.printTerminal(ns, 'Starting the daemon');
    while (true) {
        await launchRunners(ns);
        await ns.asleep(RUNNER_INTERVAL);
    }
}
