import * as ControlFlowAPI from '/src/api/ControlFlowAPI.js';
import * as LogAPI from '/src/api/LogAPI.js';
import * as JobAPI from '/src/api/JobAPI.js';
import { CONSTANT } from '/src/lib/constants.js';
import * as Utils from '/src/util/Utils.js';
import { Tools } from '/src/tools/Tools.js';
const JOB_MANAGING_LOOP_INTERVAL = 1000;
class JobManager {
    constructor(validation) {
        this.validation = validation;
    }
    async initialize(ns) {
        Utils.disableLogging(ns);
        const jobMap = await JobAPI.getJobMap(ns);
        if (jobMap.batches.length > 0) {
            await JobAPI.cancelAllJobs(ns);
        }
    }
    async start(ns) {
        LogAPI.debug(ns, `Starting the JobManager`);
        this.managingLoopInterval = setInterval(this.managingLoop.bind(this, ns), JOB_MANAGING_LOOP_INTERVAL);
    }
    async destroy(ns) {
        if (this.managingLoopInterval)
            clearInterval(this.managingLoopInterval);
        await JobAPI.cancelAllJobs(ns);
        await JobAPI.clearJobMap(ns);
        LogAPI.debug(ns, `Stopping the JobManager`);
    }
    async managingLoop(ns) {
        const jobMap = JobAPI.getJobMap(ns);
        const runningProcesses = JobAPI.getRunningProcesses(ns);
        // NOTE: It might be better to provide the batch id to the api and kill that way
        const finishedJobs = [];
        for (const batch of jobMap.batches) {
            const jobs = batch.jobs.filter((job) => !job.pids.some((pid) => runningProcesses.some((process) => process.pid === pid)));
            finishedJobs.push(...jobs);
        }
        if (finishedJobs.length > 0)
            JobAPI.finishJobs(ns, finishedJobs);
        // We want to validate in between to make sure that we validate finished batches as well
        // NOTE: This will make it a bit slower
        if (this.validation)
            JobManager.validate(ns);
        if (finishedJobs.length > 0)
            JobAPI.removeFinishedBatches(ns);
    }
    static validate(ns) {
        const jobMap = JobAPI.getJobMap(ns);
        jobMap.batches.forEach((batch) => {
            let isValid;
            if (batch.jobs[0].isPrep)
                isValid = this.validatePrep(ns, batch);
            else
                isValid = this.validateAttack(ns, batch);
            if (!isValid)
                console.log(batch);
        });
    }
    // validatePrep only checks the timings of each prep
    static validatePrep(ns, batch) {
        const targetHost = batch.target.characteristics.host;
        const batchId = batch.batchId;
        if (batch.jobs.length === 1) {
            // We only did a weaken, so we can't check timings
            return true;
        }
        else if (batch.jobs.length === 2) {
            // We did a grow and weaken combination
            const growth = batch.jobs.find((job) => job.tool === Tools.GROW);
            const weaken = batch.jobs.find((job) => job.tool === Tools.WEAKEN);
            if (!growth || !weaken) {
                LogAPI.warn(ns, `${batchId} An incorrect prep was created for ${targetHost}`);
                return false;
            }
            if (!growth.finished && weaken.finished) {
                LogAPI.warn(ns, `${batchId} Prep timings are off, weaken finished before growth`);
                return false;
            }
        }
        else if (batch.jobs.length === 3) {
            // We did a grow and weaken combination
            // NOTE: Here we assume that the batch was sorted on end times (first end time goes first)
            const initialWeaken = batch.jobs.find((job) => job.tool === Tools.WEAKEN);
            const growth = batch.jobs.find((job) => job.tool === Tools.GROW);
            const compensationWeaken = batch.jobs.reverse().find((job) => job.tool === Tools.WEAKEN);
            if (!initialWeaken || !growth || !compensationWeaken) {
                LogAPI.warn(ns, `${batchId} An incorrect prep was created for ${targetHost}`);
                return false;
            }
            if (!initialWeaken.finished && (growth.finished || compensationWeaken.finished)) {
                LogAPI.warn(ns, `${batchId} Prep timings are off, growth or compensation finished before weaken`);
                return false;
            }
            else if (compensationWeaken.finished && !growth.finished) {
                LogAPI.warn(ns, `${batchId} Prep timings are off, compensation weaken finished before growth`);
                return false;
            }
        }
        return true;
    }
    static validateAttack(ns, batch) {
        return true;
    }
}
export async function start(ns, validate) {
    if (isRunning(ns))
        return;
    // TODO: Check whether there is enough ram available
    if (validate) {
        ns.exec('/src/managers/JobManager.js', CONSTANT.HOME_SERVER_HOST, 1, '--validate');
    }
    else {
        ns.exec('/src/managers/JobManager.js', CONSTANT.HOME_SERVER_HOST);
    }
    while (!isRunning(ns)) {
        await ns.sleep(CONSTANT.SMALL_DELAY);
    }
}
export function isRunning(ns) {
    return ns.isRunning('/src/managers/JobManager.js', CONSTANT.HOME_SERVER_HOST) ||
        ns.isRunning('/src/managers/JobManager.js', CONSTANT.HOME_SERVER_HOST, '--validate');
}
export async function main(ns) {
    if (ns.getHostname() !== 'home') {
        throw new Error('Run the script from home');
    }
    const flags = ns.flags([
        ['validate', false],
    ]);
    const instance = new JobManager(flags.validate);
    await instance.initialize(ns);
    await instance.start(ns);
    while (!ControlFlowAPI.hasManagerKillRequest(ns)) {
        await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL);
    }
    await instance.destroy(ns);
}
