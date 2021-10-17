import * as LogAPI from '/src/api/LogAPI.js';
import * as Utils from '/src/util/Utils.js';
import * as HackingUtils from '/src/util/HackingUtils.js';
import { CONSTANT } from '/src/lib/constants.js';
import * as ServerAPI from '/src/api/ServerAPI.js';
import { ServerPurpose, ServerType } from '/src/classes/Server/ServerInterfaces.js';
import * as JobAPI from '/src/api/JobAPI.js';
const JOB_MANAGING_LOOP_INTERVAL = 1000;
const HACKING_LOOP_DELAY = 2000;
const UTILIZATION_DATA_POINTS = 10;
const UTILIZATION_DELTA_THRESHOLD = 0.4;
const MAX_TARGET_COUNT = 30;
class HackingManager {
    hackingLoopInterval;
    jobLoopInterval;
    dataPoints = {
        hacknetServers: [],
        purchasedServers: [],
    };
    static getUtilizationDataPoint(ns, servers) {
        return {
            prep: ServerAPI.getServerUtilization(ns, servers, ServerPurpose.PREP),
            hack: ServerAPI.getServerUtilization(ns, servers, ServerPurpose.HACK),
            total: ServerAPI.getServerUtilization(ns, servers),
        };
    }
    async initialize(ns) {
        Utils.disableLogging(ns);
        ns.atExit(this.destroy.bind(this, ns));
        await ServerAPI.initializeServerMap(ns);
        await JobAPI.initializeJobMap(ns);
        await JobAPI.cancelAllJobs(ns, true);
    }
    async start(ns) {
        LogAPI.printTerminal(ns, `Starting the JobManager`);
        this.jobLoopInterval = setInterval(this.jobLoop.bind(this, ns), JOB_MANAGING_LOOP_INTERVAL);
        LogAPI.printTerminal(ns, `Starting the HackingManager`);
        this.hackingLoopInterval = setTimeout(this.hackingLoop.bind(this, ns), HACKING_LOOP_DELAY);
    }
    async destroy(ns) {
        if (this.hackingLoopInterval)
            clearTimeout(this.hackingLoopInterval);
        if (this.jobLoopInterval)
            clearInterval(this.jobLoopInterval);
        await JobAPI.cancelAllJobs(ns);
        await JobAPI.clearJobMap(ns);
        LogAPI.printTerminal(ns, `Stopping the JobManager`);
        LogAPI.printTerminal(ns, `Stopping the HackingManager`);
    }
    async updatePurchasedServerPurposes(ns) {
        const servers = ServerAPI.getPurchasedServers(ns);
        const dataPoint = HackingManager.getUtilizationDataPoint(ns, servers);
        this.dataPoints.purchasedServers.length = Math.min(this.dataPoints.purchasedServers.length, UTILIZATION_DATA_POINTS - 1);
        this.dataPoints.purchasedServers.unshift(dataPoint);
        if (this.dataPoints.purchasedServers.length < UTILIZATION_DATA_POINTS)
            return;
        const shouldAddPrepServer = this.dataPoints.purchasedServers.every((point) => point.prep - point.hack > UTILIZATION_DELTA_THRESHOLD);
        const shouldAddHackServer = this.dataPoints.purchasedServers.every((point) => {
            return point.hack - point.prep > UTILIZATION_DELTA_THRESHOLD || point.prep < UTILIZATION_DELTA_THRESHOLD;
        });
        if (shouldAddHackServer)
            await ServerAPI.moveServerPurpose(ns, ServerPurpose.HACK, ServerType.PurchasedServer);
        else if (shouldAddPrepServer)
            await ServerAPI.moveServerPurpose(ns, ServerPurpose.PREP, ServerType.PurchasedServer);
        else
            return;
        // Reset the measurements to prevent immediately adding another server
        this.dataPoints.purchasedServers.length = 0;
    }
    async updateHacknetServerPurposes(ns) {
        const servers = ServerAPI.getHacknetServers(ns);
        const dataPoint = HackingManager.getUtilizationDataPoint(ns, servers);
        this.dataPoints.hacknetServers.length = Math.min(this.dataPoints.hacknetServers.length, UTILIZATION_DATA_POINTS - 1);
        this.dataPoints.hacknetServers.unshift(dataPoint);
        if (this.dataPoints.hacknetServers.length < UTILIZATION_DATA_POINTS)
            return;
        const shouldAddPrepServer = this.dataPoints.hacknetServers.every((point) => point.prep - point.hack > UTILIZATION_DELTA_THRESHOLD);
        const shouldAddHackServer = this.dataPoints.hacknetServers.every((point) => {
            return point.hack - point.prep > UTILIZATION_DELTA_THRESHOLD || point.prep < UTILIZATION_DELTA_THRESHOLD;
        });
        if (shouldAddHackServer)
            await ServerAPI.moveServerPurpose(ns, ServerPurpose.HACK, ServerType.HacknetServer);
        else if (shouldAddPrepServer)
            await ServerAPI.moveServerPurpose(ns, ServerPurpose.PREP, ServerType.HacknetServer);
        else
            return;
        // Reset the measurements to prevent immediately adding another server
        this.dataPoints.hacknetServers.length = 0;
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
        await this.updatePurchasedServerPurposes(ns);
        await this.updateHacknetServerPurposes(ns);
        // Get the potential targets
        let potentialTargets = ServerAPI.getTargetServers(ns);
        // We would have a problem if there are no targets
        if (potentialTargets.length === 0) {
            throw new Error('No potential targets found.');
        }
        // Sort the potential targets
        potentialTargets = potentialTargets.sort((a, b) => a.serverValue - b.serverValue);
        // Attack each of the targets
        for (const target of potentialTargets) {
            const currentTargets = ServerAPI.getCurrentTargets(ns);
            // Can't have too many targets at the same time
            if (currentTargets.length >= MAX_TARGET_COUNT) {
                break;
            }
            await HackingUtils.hack(ns, target);
        }
        this.hackingLoopInterval = setTimeout(this.hackingLoop.bind(this, ns), HACKING_LOOP_DELAY);
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
        await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL);
    }
}
