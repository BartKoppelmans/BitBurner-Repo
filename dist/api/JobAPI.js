import { CONSTANT } from '/src/lib/constants.js';
import * as ServerAPI from '/src/api/ServerAPI.js';
import * as LogAPI from '/src/api/LogAPI.js';
import * as ToolUtils from '/src/util/ToolUtils.js';
import * as SerializationUtils from '/src/util/SerializationUtils.js';
import { ServerStatus } from '/src/classes/Server/ServerInterfaces.js';
export function getJobMap(ns) {
    return readJobMap(ns);
}
function readJobMap(ns) {
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
export function clearJobMap(ns) {
    ns.clear(CONSTANT.JOB_MAP_FILENAME);
}
export function writeJobMap(ns, jobMap) {
    // NOTE: Do we want to do this?
    jobMap.lastUpdated = new Date();
    ns.write(CONSTANT.JOB_MAP_FILENAME, JSON.stringify(jobMap), 'w');
}
export function startBatchJob(ns, batchJob) {
    // TODO: We should do some checking in here
    const isPrep = batchJob.jobs[0].isPrep;
    ServerAPI.setStatus(ns, batchJob.target, (isPrep) ? ServerStatus.PREPPING : ServerStatus.TARGETING);
    for (const job of batchJob.jobs) {
        startJob(ns, job);
    }
}
function startJob(ns, job) {
    // TODO: We should do some checking in here
    // TODO: If we didn't start at startBatchJob, then we don't set the server status
    job.execute(ns);
    job.onStart(ns);
    writeJob(ns, job);
    const threadSpread = job.threadSpread;
    for (const [server, threads] of threadSpread) {
        const reservation = threads * ToolUtils.getToolCost(ns, job.tool);
        ServerAPI.decreaseReservation(ns, server, reservation);
    }
}
export function finishJobs(ns, jobs) {
    // NOTE: This function manually removes the jobs instead of using removeJob (for performance reasons)
    const jobMap = getJobMap(ns);
    for (const job of jobs) {
        const index = jobMap.jobs.findIndex((j) => j.id === job.id);
        if (index === -1)
            throw new Error('Could not find the job'); // NOTE: This should not crash the script
        jobMap.jobs.splice(index, 1);
        job.onFinish(ns);
    }
    const batches = [...new Map(jobs.map(job => [job.batchId, job])).values()]
        .map((job) => {
        return { target: job.target, batchId: job.batchId };
    });
    for (const batch of batches) {
        const isBatchFinished = !jobMap.jobs.some((job) => job.batchId === batch.batchId);
        if (isBatchFinished)
            ServerAPI.setStatus(ns, batch.target, ServerStatus.NONE);
    }
    writeJobMap(ns, jobMap);
}
export function writeJob(ns, job) {
    const jobMap = getJobMap(ns);
    jobMap.jobs.push(job);
    writeJobMap(ns, jobMap);
}
export function getRunningProcesses(ns) {
    const serverMap = ServerAPI.getServerMap(ns);
    const runningProcesses = [];
    for (const server of serverMap.servers) {
        runningProcesses.push(...ns.ps(server.characteristics.host));
    }
    return runningProcesses;
}
export function cancelAllJobs(ns) {
    const jobMap = getJobMap(ns);
    for (const job of jobMap.jobs) {
        cancelJob(ns, job);
    }
    // TODO: Check whether there are still jobs left that are not cancelled
}
export function cancelJob(ns, job) {
    // TODO: We should do some checking here
    if (job.pids.length === 0)
        throw new Error('Cannot cancel a job without the pids');
    let allKilled = true;
    for (const pid of job.pids) {
        const processKilled = ns.kill(pid);
        allKilled = allKilled && processKilled;
    }
    job.onCancel(ns);
    if (!allKilled)
        LogAPI.warn(ns, 'Failed to cancel all jobs');
}
export function initializeJobMap(ns) {
    const jobMap = { lastUpdated: new Date(), jobs: [] };
    writeJobMap(ns, jobMap);
}
