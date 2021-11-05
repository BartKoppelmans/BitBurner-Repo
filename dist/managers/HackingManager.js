import * as LogAPI from '/src/api/LogAPI.js';
import * as Utils from '/src/util/Utils.js';
import * as HackingUtils from '/src/util/HackingUtils.js';
import { CONSTANT } from '/src/lib/constants.js';
import * as ServerAPI from '/src/api/ServerAPI.js';
import { ServerPurpose, ServerStatus } from '/src/classes/Server/ServerInterfaces.js';
import * as JobAPI from '/src/api/JobAPI.js';
const LOOP_DELAY = 2000;
class HackingManager {
    inFullAttackMode = false;
    serverMapLastUpdated = CONSTANT.EPOCH_DATE;
    async initialize(ns) {
        Utils.disableLogging(ns);
        ns.atExit(this.destroy.bind(this, ns));
        await ServerAPI.initializeServerMap(ns);
        await this.resetServerPurposes(ns);
        await JobAPI.initializeJobMap(ns);
        await JobAPI.cancelAllJobs(ns, true);
    }
    async start(ns) {
        LogAPI.printTerminal(ns, `Starting the HackingManager`);
    }
    async destroy(ns) {
        await JobAPI.cancelAllJobs(ns);
        await JobAPI.clearJobMap(ns);
        LogAPI.printTerminal(ns, `Stopping the JobManager`);
        LogAPI.printTerminal(ns, `Stopping the HackingManager`);
    }
    async resetServerPurposes(ns) {
        await ServerAPI.setPurpose(ns, CONSTANT.HOME_SERVER_HOST, ServerPurpose.HACK);
        const hackableServers = ServerAPI.getHackableServers(ns);
        const purchasedServers = ServerAPI.getPurchasedServers(ns, 'alphabetic');
        const hacknetServers = ServerAPI.getHacknetServers(ns, 'alphabetic');
        if (hackableServers.length > 0) {
            for (const hackableServer of hackableServers) {
                await ServerAPI.setPurpose(ns, hackableServer.characteristics.host, ServerPurpose.PREP);
            }
        }
        // Set half of the purchasedServers to prep/hack
        if (purchasedServers.length > 0) {
            await HackingManager.setSplitServerPurposes(purchasedServers, ns);
        }
        if (hacknetServers.length > 0) {
            await HackingManager.setSplitServerPurposes(hacknetServers, ns);
        }
        this.inFullAttackMode = false;
    }
    async fullAttackMode(ns) {
        await ServerAPI.setPurpose(ns, CONSTANT.HOME_SERVER_HOST, ServerPurpose.HACK);
        const hackableServers = ServerAPI.getHackableServers(ns);
        const purchasedServers = ServerAPI.getPurchasedServers(ns, 'alphabetic');
        const hacknetServers = ServerAPI.getHacknetServers(ns, 'alphabetic');
        if (hackableServers.length > 0) {
            for (const hackableServer of hackableServers) {
                await ServerAPI.setPurpose(ns, hackableServer.characteristics.host, ServerPurpose.HACK);
            }
        }
        // Set half of the purchasedServers to prep/hack
        if (purchasedServers.length > 0) {
            for (const purchasedServer of purchasedServers) {
                await ServerAPI.setPurpose(ns, purchasedServer.characteristics.host, ServerPurpose.HACK);
            }
        }
        if (hacknetServers.length > 0) {
            for (const hacknetServer of hacknetServers) {
                await ServerAPI.setPurpose(ns, hacknetServer.characteristics.host, ServerPurpose.HACK);
            }
        }
        this.inFullAttackMode = true;
    }
    static async setSplitServerPurposes(servers, ns) {
        const halfwayIndex = Math.ceil(servers.length / 2);
        const prepServers = servers.slice(0, halfwayIndex);
        const hackServers = servers.slice(halfwayIndex, servers.length);
        for (const prepServer of prepServers) {
            await ServerAPI.setPurpose(ns, prepServer.characteristics.host, ServerPurpose.PREP);
        }
        for (const hackServer of hackServers) {
            await ServerAPI.setPurpose(ns, hackServer.characteristics.host, ServerPurpose.HACK);
        }
    }
    async updatePurposes(ns, targets) {
        const lastUpdated = ServerAPI.getLastUpdated(ns);
        const wasUpdated = this.serverMapLastUpdated < lastUpdated;
        if (wasUpdated)
            this.serverMapLastUpdated = lastUpdated;
        // NOTE: Slice to make sure that we only check our actual targets
        const allOptimal = targets.slice(0, CONSTANT.MAX_TARGET_COUNT)
            .filter((target) => target.status !== ServerStatus.TARGETING)
            .every((target) => target.isOptimal(ns));
        if ((wasUpdated && allOptimal) || (allOptimal && !this.inFullAttackMode)) {
            await this.fullAttackMode(ns);
        }
        else if ((wasUpdated && !allOptimal) || (!allOptimal && this.inFullAttackMode)) {
            await this.resetServerPurposes(ns);
        }
    }
    async jobLoop(ns) {
        const jobMap = JobAPI.getJobMap(ns);
        const runningProcesses = JobAPI.getRunningProcesses(ns);
        // NOTE: It might be better to provide the batch id to the api and kill that way
        const finishedJobs = [];
        for (const batch of jobMap.batches) {
            const jobs = batch.jobs.filter((job) => !job.pids.some((pid) => runningProcesses.some((process) => process.pid === pid)));
            finishedJobs.push(...jobs);
        }
        if (finishedJobs.length > 0)
            await JobAPI.finishJobs(ns, finishedJobs);
    }
    async hackingLoop(ns) {
        // TODO: Set all hackable servers to prep
        // Get the potential targets
        let potentialTargets = ServerAPI.getTargetServers(ns);
        // We would have a problem if there are no targets
        if (potentialTargets.length === 0) {
            throw new Error('No potential targets found.');
        }
        // Sort the potential targets
        potentialTargets = potentialTargets.sort((a, b) => a.serverValue - b.serverValue);
        await this.updatePurposes(ns, potentialTargets);
        // Attack each of the targets
        for (const target of potentialTargets) {
            const currentTargets = ServerAPI.getCurrentTargets(ns);
            // Can't have too many targets at the same time
            if (currentTargets.length >= CONSTANT.MAX_TARGET_COUNT) {
                break;
            }
            await HackingUtils.hack(ns, target);
        }
    }
}
export async function main(ns) {
    if (ns.getHostname() !== 'home') {
        throw new Error('Run the script from home');
    }
    const instance = new HackingManager();
    await instance.initialize(ns);
    await instance.start(ns);
    while (true) {
        await instance.jobLoop(ns);
        await instance.hackingLoop(ns);
        await ns.asleep(LOOP_DELAY);
    }
}
