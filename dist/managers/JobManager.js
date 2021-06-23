import * as ControlFlowAPI from "/src/api/ControlFlowAPI.js";
import * as ServerAPI from "/src/api/ServerAPI.js";
import Job from "/src/classes/Job.js";
import { ServerStatus } from "/src/interfaces/ServerInterfaces.js";
import { CONSTANT } from "/src/lib/constants.js";
import * as Utils from "/src/util/Utils.js";
export default class JobManager {
    constructor() {
        this.managingLoopIntervals = [];
        this.jobs = [];
    }
    async initialize(ns) {
        Utils.disableLogging(ns);
        // Clear the ports
        this.clearAllPorts(ns);
        if (this.managingLoopIntervals.length > 0) {
            for (const interval of this.managingLoopIntervals) {
                clearInterval(interval);
            }
            this.managingLoopIntervals = [];
        }
    }
    async start(ns) {
        Utils.tprintColored(`Starting the JobManager`, true, CONSTANT.COLOR_INFORMATION);
        const ports = [...CONSTANT.JOB_PORT_NUMBERS];
        for (const port of ports) {
            const interval = setInterval(this.managingLoop.bind(this, ns, port), CONSTANT.JOB_MANAGING_LOOP_INTERVAL);
            this.managingLoopIntervals.push(interval);
            this.managingLoop(ns, port);
        }
    }
    async onDestroy(ns) {
        this.clearAllPorts(ns);
        if (this.managingLoopIntervals.length > 0) {
            for (const interval of this.managingLoopIntervals) {
                clearInterval(interval);
            }
            this.managingLoopIntervals = [];
        }
        Utils.tprintColored(`Stopping the JobManager`, true, CONSTANT.COLOR_INFORMATION);
    }
    async managingLoop(ns, port) {
        const portHandle = ns.getPortHandle(port);
        if (portHandle.empty())
            return;
        const jobStrings = [...portHandle.data];
        // This might give us some trouble
        // TODO: Assert that we have all the strings
        portHandle.clear();
        // Process all job strings
        for (const jobString of jobStrings) {
            const job = Job.parseJobString(ns, jobString);
            this.jobs.push(job);
            job.onStart(ns);
            setTimeout(this.finishJob.bind(this, ns, job.id), job.end.getTime() - Date.now());
        }
    }
    async finishJob(ns, id) {
        const index = this.jobs.findIndex(job => job.id === id);
        if (index === -1) {
            throw new Error("Could not find the job");
        }
        const job = this.jobs.splice(index, 1)[0];
        const otherJobIndex = this.jobs.findIndex((job) => job.target.characteristics.host === job.target.characteristics.host);
        if (otherJobIndex === -1) {
            await ServerAPI.updateStatus(ns, job.target, ServerStatus.NONE);
        }
        job.onFinish(ns);
    }
    clearAllPorts(ns) {
        const ports = [...CONSTANT.JOB_PORT_NUMBERS];
        for (const port of ports) {
            const portHandle = ns.getPortHandle(port);
            portHandle.clear();
        }
    }
}
;
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
            await instance.onDestroy(ns);
            ns.exit();
        }
        await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL);
    }
}
