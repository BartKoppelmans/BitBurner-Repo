import { hasManagerKillRequest } from '/src/api/ControlFlowAPI.js';
import * as LogAPI from '/src/api/LogAPI.js';
import * as Utils from '/src/util/Utils.js';
import * as Daemon from '/src/scripts/daemon.js';
import { CONSTANT } from '/src/lib/constants.js';
import * as ServerAPI from '/src/api/ServerAPI.js';
import { ServerPurpose, ServerStatus } from '/src/classes/Server/ServerInterfaces.js';
import Job from '/src/classes/Job/Job.js';
import * as HackUtils from '/src/util/HackUtils.js';
import { Tools } from '/src/tools/Tools.js';
import * as ToolUtils from '/src/util/ToolUtils.js';
import Batch from '/src/classes/Job/Batch.js';
import * as JobAPI from '/src/api/JobAPI.js';
import * as CycleUtils from '/src/util/CycleUtils.js';
import { Managers } from '/src/managers/Managers.js';
const LOOP_DELAY = 2000;
const UTILIZATION_DATA_POINTS = 10;
const UTILIZATION_DELTA_THRESHOLD = 0.4;
const MAX_TARGET_COUNT = 30;
const MAX_CYCLE_NUMBER = 50; // TODO: Find a way to determine this dynamically
class HackingManager {
    constructor() {
        this.utilizationDataPoints = [];
    }
    static getUtilizationDataPoint(ns) {
        return {
            prep: ServerAPI.getServerUtilization(ns, true, ServerPurpose.PREP),
            hack: ServerAPI.getServerUtilization(ns, true, ServerPurpose.HACK),
            total: ServerAPI.getServerUtilization(ns, true),
        };
    }
    static hack(ns, target) {
        // If it is prepping or targeting, leave it
        if (target.status !== ServerStatus.NONE)
            return;
        // The server is not optimal, so we have to prep it first
        if (!target.isOptimal(ns)) {
            HackingManager.prepServer(ns, target);
            return;
        }
        // Make sure that the percentage that we steal is optimal
        HackingManager.optimizePerformance(ns, target);
        HackingManager.attackServer(ns, target);
        return;
    }
    static prepServer(ns, target) {
        // If the server is optimal, we are done I guess
        if (target.isOptimal(ns))
            return;
        let initialWeakenJob;
        let growJob;
        let compensationWeakenJob;
        const batchId = Utils.generateHash();
        let startTime;
        let endTime;
        const jobs = [];
        let availableThreads = HackUtils.calculateMaxThreads(ns, Tools.WEAKEN, true);
        if (availableThreads <= 0) {
            LogAPI.debug(ns, 'Skipped a prep.');
            return;
        }
        // TODO: Ideally we pick the server that can fit all our threads here immediately,
        // then we can have everything on one source server
        // TODO: Refactor this shitshow
        if (target.needsWeaken(ns)) {
            const neededWeakenThreads = HackUtils.calculateWeakenThreads(ns, target);
            const weakenThreads = Math.min(neededWeakenThreads, availableThreads);
            const weakenThreadSpread = HackUtils.computeThreadSpread(ns, Tools.WEAKEN, weakenThreads, true);
            const weakenTime = target.getWeakenTime(ns);
            const weakenStart = new Date(Date.now() + CONSTANT.INITIAL_JOB_DELAY);
            const weakenEnd = new Date(weakenStart.getTime() + weakenTime);
            startTime = weakenStart;
            endTime = weakenEnd;
            initialWeakenJob = new Job(ns, {
                id: Utils.generateHash(),
                batchId,
                start: weakenStart,
                end: weakenEnd,
                target,
                threads: weakenThreads,
                threadSpread: weakenThreadSpread,
                tool: Tools.WEAKEN,
                isPrep: true,
            });
            jobs.push(initialWeakenJob);
            availableThreads -= weakenThreads;
            for (const [server, threads] of weakenThreadSpread) {
                ServerAPI.increaseReservation(ns, server, threads * ToolUtils.getToolCost(ns, Tools.WEAKEN));
            }
        }
        // First grow, so that the amount of money is optimal
        if (target.needsGrow(ns) && availableThreads > 0) {
            const neededGrowthThreads = HackUtils.calculateGrowthThreads(ns, target);
            const compensationWeakenThreads = HackUtils.calculateCompensationWeakenThreads(ns, target, Tools.GROW, neededGrowthThreads);
            const totalThreads = neededGrowthThreads + compensationWeakenThreads;
            const threadsFit = (totalThreads < availableThreads);
            // NOTE: Here we do Math.floor, which could cause us not to execute enough weakens/grows
            // However, we currently run into a lot of errors regarding too little threads available, which is why we do
            // this.
            const growthThreads = (threadsFit) ? neededGrowthThreads : Math.floor(neededGrowthThreads * (availableThreads / totalThreads));
            const weakenThreads = (threadsFit) ? compensationWeakenThreads : Math.floor(compensationWeakenThreads * (availableThreads / totalThreads));
            if (growthThreads > 0 && weakenThreads > 0) {
                const weakenTime = target.getWeakenTime(ns);
                const growthTime = target.getGrowTime(ns);
                const firstStartTime = (initialWeakenJob) ? new Date(initialWeakenJob.end.getTime() + CONSTANT.JOB_DELAY) : new Date(Date.now() + CONSTANT.INITIAL_JOB_DELAY);
                let growthStartTime;
                let growthEndTime;
                let compensationWeakenEndTime;
                let compensationWeakenStartTime;
                if ((growthTime + CONSTANT.JOB_DELAY) > weakenTime) {
                    growthStartTime = new Date(firstStartTime.getTime());
                    growthEndTime = new Date(growthStartTime.getTime() + growthTime);
                    compensationWeakenEndTime = new Date(growthEndTime.getTime() + CONSTANT.JOB_DELAY);
                    compensationWeakenStartTime = new Date(compensationWeakenEndTime.getTime() - weakenTime);
                }
                else {
                    compensationWeakenStartTime = new Date(firstStartTime.getTime());
                    compensationWeakenEndTime = new Date(compensationWeakenStartTime.getTime() + growthTime);
                    growthEndTime = new Date(compensationWeakenEndTime.getTime() - CONSTANT.JOB_DELAY);
                    growthStartTime = new Date(growthEndTime.getTime() - growthTime);
                }
                startTime = firstStartTime;
                endTime = compensationWeakenEndTime;
                const growthThreadSpread = HackUtils.computeThreadSpread(ns, Tools.GROW, growthThreads, true);
                growJob = new Job(ns, {
                    id: Utils.generateHash(),
                    batchId,
                    target,
                    threads: growthThreads,
                    threadSpread: growthThreadSpread,
                    tool: Tools.GROW,
                    isPrep: true,
                    start: growthStartTime,
                    end: growthEndTime,
                });
                jobs.push(growJob);
                for (const [server, threads] of growthThreadSpread) {
                    ServerAPI.increaseReservation(ns, server, threads * ToolUtils.getToolCost(ns, Tools.GROW));
                }
                const compensationWeakenThreadSpread = HackUtils.computeThreadSpread(ns, Tools.WEAKEN, weakenThreads, true);
                compensationWeakenJob = new Job(ns, {
                    id: Utils.generateHash(),
                    batchId,
                    target,
                    threads: weakenThreads,
                    threadSpread: compensationWeakenThreadSpread,
                    tool: Tools.WEAKEN,
                    isPrep: true,
                    start: compensationWeakenStartTime,
                    end: compensationWeakenEndTime,
                });
                jobs.push(compensationWeakenJob);
                for (const [server, threads] of compensationWeakenThreadSpread) {
                    ServerAPI.increaseReservation(ns, server, threads * ToolUtils.getToolCost(ns, Tools.WEAKEN));
                }
            }
        }
        // We could not create any jobs, probably the RAM was already fully used.
        // TODO: Filter this at the start, if we cannot start any threads, we should not even go here
        if (jobs.length === 0)
            return;
        if (!startTime || !endTime)
            throw new Error('How the fuck do we not have timings available?');
        const batchJob = new Batch(ns, {
            batchId,
            target,
            jobs,
            start: startTime,
            end: endTime,
        });
        JobAPI.startBatch(ns, batchJob);
    }
    static attackServer(ns, target) {
        const numPossibleCycles = CycleUtils.computeCycles(ns, target);
        const numCycles = Math.min(numPossibleCycles, MAX_CYCLE_NUMBER);
        const batchId = Utils.generateHash();
        if (numCycles === 0) {
            LogAPI.debug(ns, 'Skipped an attack.');
            return;
        }
        const cycles = [];
        for (let i = 0; i < numCycles; i++) {
            const cycle = CycleUtils.scheduleCycle(ns, target, batchId, cycles[cycles.length - 1]);
            cycles.push(cycle);
        }
        if (cycles.length === 0) {
            throw new Error('No cycles created');
        }
        const startTime = cycles[0].weaken1.start;
        const endTime = cycles[cycles.length - 1].weaken2.end;
        const jobs = cycles.reduce((array, cycle) => [...array, cycle.hack, cycle.weaken1, cycle.growth, cycle.weaken2], []);
        // Create the batch object
        const batchJob = new Batch(ns, {
            batchId,
            target,
            jobs,
            start: startTime,
            end: endTime,
        });
        JobAPI.startBatch(ns, batchJob);
    }
    static optimizePerformance(ns, target) {
        // PERFORMANCE: This is a very expensive function call
        // TODO: This does not seem to work properly?
        let performanceUpdated = false;
        const hackingServers = ServerAPI.getHackingServers(ns);
        const originalPercentageToSteal = target.percentageToSteal;
        let optimalTarget = {
            percentageToSteal: CONSTANT.MIN_PERCENTAGE_TO_STEAL,
            profitsPerSecond: -1,
        };
        for (let n = CONSTANT.MIN_PERCENTAGE_TO_STEAL; n <= CONSTANT.MAX_PERCENTAGE_TO_STEAL; n += CONSTANT.DELTA_PERCENTAGE_TO_STEAL) {
            target.percentageToSteal = n;
            const cycles = CycleUtils.computeCycles(ns, target, hackingServers);
            const profit = target.staticHackingProperties.maxMoney * target.percentageToSteal * cycles;
            const totalTime = CycleUtils.calculateTotalBatchTime(ns, target, cycles);
            const profitsPerSecond = profit / totalTime;
            if (profitsPerSecond > optimalTarget.profitsPerSecond) {
                optimalTarget = { percentageToSteal: n, profitsPerSecond };
            }
        }
        target.percentageToSteal = optimalTarget.percentageToSteal;
        if (originalPercentageToSteal !== optimalTarget.percentageToSteal)
            performanceUpdated = true;
        if (performanceUpdated) {
            LogAPI.debug(ns, `Updated percentage to steal for ${target.characteristics.host} to ~${Math.round(target.percentageToSteal * 100)}%`);
        }
    }
    async initialize(ns) {
        Utils.disableLogging(ns);
        await ServerAPI.initializeServerMap(ns);
        await JobAPI.initializeJobMap(ns);
        await Daemon.startManager(ns, Managers.JobManager);
    }
    async start(ns) {
        LogAPI.debug(ns, `Starting the HackingManager`);
        this.managingLoopTimeout = setTimeout(this.managingLoop.bind(this, ns), LOOP_DELAY);
    }
    async destroy(ns) {
        if (this.managingLoopTimeout)
            clearTimeout(this.managingLoopTimeout);
        LogAPI.debug(ns, `Stopping the HackingManager`);
    }
    updatePurchasedServerPurposes(ns) {
        const dataPoint = HackingManager.getUtilizationDataPoint(ns);
        this.utilizationDataPoints.length = Math.min(this.utilizationDataPoints.length, UTILIZATION_DATA_POINTS - 1);
        this.utilizationDataPoints.unshift(dataPoint);
        if (this.utilizationDataPoints.length < UTILIZATION_DATA_POINTS)
            return;
        const shouldAddPrepServer = this.utilizationDataPoints.every((point) => point.prep - point.hack > UTILIZATION_DELTA_THRESHOLD);
        const shouldAddHackServer = this.utilizationDataPoints.every((point) => {
            return point.hack - point.prep > UTILIZATION_DELTA_THRESHOLD || point.prep < UTILIZATION_DELTA_THRESHOLD;
        });
        if (shouldAddHackServer)
            ServerAPI.addHackingServer(ns);
        else if (shouldAddPrepServer)
            ServerAPI.addPreppingServer(ns);
        else
            return;
        // Reset the measurements to prevent immediately adding another server
        this.utilizationDataPoints.length = 0;
    }
    async managingLoop(ns) {
        this.updatePurchasedServerPurposes(ns);
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
            await HackingManager.hack(ns, target);
        }
        this.managingLoopTimeout = setTimeout(this.managingLoop.bind(this, ns), LOOP_DELAY);
    }
}
export async function main(ns) {
    if (ns.getHostname() !== 'home') {
        throw new Error('Run the script from home');
    }
    const instance = new HackingManager();
    await instance.initialize(ns);
    await instance.start(ns);
    while (!hasManagerKillRequest(ns)) {
        await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL);
    }
    await instance.destroy(ns);
}
