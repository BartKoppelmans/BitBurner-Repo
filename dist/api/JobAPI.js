import * as ServerAPI from '/src/api/ServerAPI.js';
import * as LogAPI from '/src/api/LogAPI.js';
import * as ToolUtils from '/src/util/ToolUtils.js';
import { ServerStatus } from '/src/classes/Server/ServerInterfaces.js';
import { Tools } from '/src/tools/Tools.js';
import { JobStorage } from '/src/classes/Storage/JobStorage';
export async function startBatch(ns, jobStorage, batch) {
    // TODO: We should do some checking in here
    const isPrep = batch.jobs[0].isPrep;
    await ServerAPI.setStatus(ns, batch.target.characteristics.host, (isPrep) ? ServerStatus.PREPPING : ServerStatus.TARGETING);
    await startJobs(ns, batch.jobs);
    jobStorage.addBatch(batch);
}
async function startJobs(ns, jobs) {
    // TODO: We should do some checking in here
    for (const job of jobs) {
        await job.execute(ns);
        job.onStart(ns);
    }
    const ramSpread = createRamSpread(ns, jobs);
    await ServerAPI.decreaseReservations(ns, ramSpread);
}
function createRamSpread(ns, jobs) {
    const ramSpread = new Map();
    for (const job of jobs) {
        const threadCost = ToolUtils.getToolCost(ns, job.tool);
        for (const [server, threads] of job.threadSpread) {
            let ram = threads * threadCost;
            if (ramSpread.has(server)) {
                ram += ramSpread.get(server);
            }
            ramSpread.set(server, ram);
        }
    }
    return ramSpread;
}
export async function finishJobs(ns, jobStorage, jobs) {
    for (const job of jobs) {
        if (job.finished)
            continue;
        jobStorage.setJobStatus(job, true);
        job.onFinish(ns);
    }
    const batches = [...jobStorage.batches];
    for (const batch of batches) {
        if (JobStorage.isBatchFinished(batch)) {
            await ServerAPI.setStatus(ns, batch.target.characteristics.host, ServerStatus.NONE);
            jobStorage.removeBatch(batch);
        }
    }
}
export function getRunningProcesses(ns) {
    const serverMap = ServerAPI.getServerMap(ns);
    const runningProcesses = [];
    for (const server of serverMap.servers) {
        runningProcesses.push(...ns.ps(server.characteristics.host));
    }
    return runningProcesses;
}
export function cancelAllJobs(ns, jobStorage) {
    if (jobStorage) {
        for (const batch of jobStorage.batches) {
            for (const job of batch.jobs) {
                job.finished = true;
                cancelJob(ns, jobStorage, job);
            }
        }
        jobStorage.clear();
    }
    else {
        const serverMap = ServerAPI.getServerMap(ns);
        for (const server of serverMap.servers) {
            ns.scriptKill(Tools.WEAKEN, server.characteristics.host);
            ns.scriptKill(Tools.GROW, server.characteristics.host);
            ns.scriptKill(Tools.HACK, server.characteristics.host);
        }
    }
}
export function cancelJob(ns, jobStorage, job) {
    // TODO: We should do some checking here
    if (job.finished)
        return; // The job has already finished so meh
    if (job.pids.length === 0)
        throw new Error('Cannot cancel a job without the pids');
    let allKilled = true;
    for (const pid of job.pids) {
        const processKilled = ns.kill(pid);
        allKilled = allKilled && processKilled;
    }
    job.onCancel(ns);
    if (!allKilled)
        LogAPI.printTerminal(ns, `Failed to cancel job ${job.id}`);
}
