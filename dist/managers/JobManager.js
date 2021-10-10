import { hasManagerKillRequest } from '/src/api/ControlFlowAPI.js';
import * as LogAPI from '/src/api/LogAPI.js';
import * as JobAPI from '/src/api/JobAPI.js';
import { CONSTANT } from '/src/lib/constants.js';
import * as Utils from '/src/util/Utils.js';
const JOB_MANAGING_LOOP_INTERVAL = 1000;
class JobManager {
    async initialize(ns) {
        Utils.disableLogging(ns);
        const jobMap = JobAPI.getJobMap(ns);
        if (jobMap.batches.length > 0) {
            JobAPI.cancelAllJobs(ns);
        }
    }
    async start(ns) {
        LogAPI.printTerminal(ns, `Starting the JobManager`);
        this.managingLoopInterval = setInterval(this.managingLoop.bind(this, ns), JOB_MANAGING_LOOP_INTERVAL);
    }
    async destroy(ns) {
        if (this.managingLoopInterval)
            clearInterval(this.managingLoopInterval);
        await JobAPI.cancelAllJobs(ns);
        await JobAPI.clearJobMap(ns);
        LogAPI.printTerminal(ns, `Stopping the JobManager`);
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
            await JobAPI.finishJobs(ns, finishedJobs);
    }
}
export async function main(ns) {
    if (ns.getHostname() !== 'home') {
        throw new Error('Run the script from home');
    }
    const instance = new JobManager();
    await instance.initialize(ns);
    await instance.start(ns);
    while (!hasManagerKillRequest(ns)) {
        await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL);
    }
    await instance.destroy(ns);
}
