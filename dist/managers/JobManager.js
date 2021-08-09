import * as ControlFlowAPI from '/src/api/ControlFlowAPI.js';
import * as LogAPI from '/src/api/LogAPI.js';
import * as JobAPI from '/src/api/JobAPI.js';
import { LogMessageCode } from '/src/interfaces/PortMessageInterfaces.js';
import { CONSTANT } from '/src/lib/constants.js';
import * as Utils from '/src/util/Utils.js';
class JobManager {
    async initialize(ns) {
        Utils.disableLogging(ns);
        const jobMap = await JobAPI.getJobMap(ns);
        if (jobMap.jobs.length > 0) {
            await JobAPI.cancelAllJobs(ns);
        }
    }
    async start(ns) {
        await LogAPI.log(ns, `Starting the JobManager`, true, LogMessageCode.INFORMATION);
        this.managingLoopInterval = setInterval(this.managingLoop.bind(this, ns), CONSTANT.JOB_MANAGING_LOOP_INTERVAL);
    }
    async destroy(ns) {
        if (this.managingLoopInterval)
            clearInterval(this.managingLoopInterval);
        await JobAPI.cancelAllJobs(ns);
        await JobAPI.clearJobMap(ns);
        await LogAPI.log(ns, `Stopping the JobManager`, true, LogMessageCode.INFORMATION);
    }
    async managingLoop(ns) {
        const jobMap = await JobAPI.getJobMap(ns);
        const runningProcesses = await JobAPI.getRunningProcesses(ns);
        const finishedJobs = jobMap.jobs.filter((job) => !runningProcesses.some((process) => job.pid === process.pid));
        for (const finishedJob of finishedJobs) {
            await JobAPI.finishJob(ns, finishedJob);
        }
    }
}
export async function main(ns) {
    if (ns.getHostname() !== 'home') {
        throw new Error('Run the script from home');
    }
    const instance = new JobManager();
    await instance.initialize(ns);
    await instance.start(ns);
    while (true) {
        const shouldKill = await ControlFlowAPI.hasManagerKillRequest(ns);
        if (shouldKill) {
            await instance.destroy(ns);
            ns.exit();
            return;
        }
        await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL);
    }
}
