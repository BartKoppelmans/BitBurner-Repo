import { CONSTANT } from '/src/lib/constants.js';
import * as ServerAPI from '/src/api/ServerAPI.js';
import * as ToolUtils from '/src/util/ToolUtils.js';
import * as SerializationUtils from '/src/util/SerializationUtils.js';
import { ServerStatus } from '/src/interfaces/ServerInterfaces.js';
export async function getJobMap(ns) {
    return await readJobMap(ns);
}
async function readJobMap(ns) {
    const jobMapString = ns.read(CONSTANT.JOB_MAP_FILENAME).toString();
    const jobMap = JSON.parse(jobMapString);
    jobMap.lastUpdated = new Date(jobMap.lastUpdated);
    const jobObjects = Array.from(jobMap.jobs);
    jobMap.jobs = [];
    for (const job of jobObjects) {
        jobMap.jobs.push(SerializationUtils.jobFromJSON(ns, job));
    }
    return jobMap;
}
export async function clearJobMap(ns) {
    ns.clear(CONSTANT.JOB_MAP_FILENAME);
}
export async function writeJobMap(ns, jobMap) {
    // NOTE: Do we want to do this?
    jobMap.lastUpdated = new Date();
    ns.write(CONSTANT.JOB_MAP_FILENAME, JSON.stringify(jobMap), 'w');
}
export async function startBatchJob(ns, batchJob) {
    // TODO: We should do some checking in here
    const isPrep = batchJob.jobs[0].isPrep;
    await ServerAPI.setStatus(ns, batchJob.target, (isPrep) ? ServerStatus.PREPPING : ServerStatus.TARGETING);
    await Promise.all(batchJob.jobs.map(async (job) => {
        return startJob(ns, job);
    }));
}
async function startJob(ns, job) {
    // TODO: We should do some checking in here
    // TODO: If we didn't start at startBatchJob, then we don't set the server status
    await job.execute(ns);
    await job.onStart(ns);
    await writeJob(ns, job);
    const threadSpread = job.threadSpread;
    for (const [server, threads] of threadSpread) {
        const reservation = threads * ToolUtils.getToolCost(ns, job.tool);
        await ServerAPI.decreaseReservation(ns, server, reservation);
    }
}
export async function finishJob(ns, job) {
    await removeJob(ns, job);
    await job.onFinish(ns);
    // Checking whether the batch is finished
    const jobMap = await getJobMap(ns);
    const isBatchFinished = !jobMap.jobs.some((j) => j.batchId === job.batchId);
    if (isBatchFinished) {
        await ServerAPI.setStatus(ns, job.target, ServerStatus.NONE);
    }
}
export async function writeJob(ns, job) {
    const jobMap = await getJobMap(ns);
    jobMap.jobs.push(job);
    await writeJobMap(ns, jobMap);
}
export async function removeJob(ns, job) {
    const jobMap = await getJobMap(ns);
    const index = jobMap.jobs.findIndex((j) => j.id === job.id);
    if (index === -1)
        throw new Error('Could not find the job');
    jobMap.jobs.splice(index, 1);
    await writeJobMap(ns, jobMap);
}
export async function getRunningProcesses(ns) {
    const serverMap = await ServerAPI.getServerMap(ns);
    const runningProcesses = [];
    for (const server of serverMap.servers) {
        runningProcesses.push(...ns.ps(server.characteristics.host));
    }
    return runningProcesses;
}
export async function cancelAllJobs(ns) {
    const jobMap = await getJobMap(ns);
    await Promise.allSettled(jobMap.jobs.map(async (job) => {
        return cancelJob(ns, job);
    }));
    // TODO: This does not finish for some reason
    // TODO: Check whether there are still jobs left that are not cancelled
}
export async function cancelJob(ns, job) {
    // TODO: We should do some checking here
    if (!job.pid)
        throw new Error('Cannot cancel a job without the pid');
    const isKilled = ns.kill(job.pid);
    if (!isKilled)
        throw new Error('Failed to cancel the job');
    await job.onCancel(ns);
}
export async function isJobMapInitialized(ns) {
    // TODO: Change the restrictions here, as we have to reset the job map more often
    try {
        const currentJobMap = await readJobMap(ns);
        const lastAugTime = new Date(Date.now() - ns.getTimeSinceLastAug());
        // We have updated the server map file already, so we can stop now
        return (lastAugTime <= currentJobMap.lastUpdated);
    }
    catch (e) {
        return false;
    }
}
export async function initializeJobMap(ns) {
    const jobMap = { lastUpdated: new Date(), jobs: [] };
    await writeJobMap(ns, jobMap);
}
export async function startJobManager(ns) {
    if (isJobManagerRunning(ns))
        return;
    // TODO: Check whether there is enough ram available
    ns.exec('/src/managers/JobManager.js', CONSTANT.HOME_SERVER_HOST);
    while (!isJobManagerRunning(ns)) {
        await ns.sleep(CONSTANT.SMALL_DELAY);
    }
}
export function isJobManagerRunning(ns) {
    return ns.isRunning('/src/managers/JobManager.js', CONSTANT.HOME_SERVER_HOST);
}
