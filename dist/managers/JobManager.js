import * as ControlFlowAPI from "/src/api/ControlFlowAPI.js";
import Job from "/src/classes/Job.js";
import { JobRequestCode } from "/src/interfaces/PortMessageInterfaces.js";
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
        if (this.requestLoopInterval) {
            clearInterval(this.requestLoopInterval);
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
        this.requestLoopInterval = setInterval(this.requestLoop.bind(this, ns), CONSTANT.JOB_REQUEST_LOOP_INTERVAL);
    }
    async onDestroy(ns) {
        this.clearAllPorts(ns);
        if (this.managingLoopIntervals.length > 0) {
            for (const interval of this.managingLoopIntervals) {
                clearInterval(interval);
            }
            this.managingLoopIntervals = [];
        }
        if (this.requestLoopInterval) {
            clearInterval(this.requestLoopInterval);
        }
        Utils.tprintColored(`Stopping the JobManager`, true, CONSTANT.COLOR_INFORMATION);
    }
    async requestLoop(ns) {
        const requestPortHandle = ns.getPortHandle(CONSTANT.JOB_MANAGER_REQUEST_PORT);
        if (requestPortHandle.empty())
            return;
        let iteration = 0;
        do {
            const request = JSON.parse(requestPortHandle.read().toString());
            switch (+request.code) {
                case JobRequestCode.CURRENT_TARGETS:
                    this.onTargetRequested(ns, request);
                    break;
                case JobRequestCode.IS_PREPPING:
                    this.onHasActionRequested(ns, request, true);
                    break;
                case JobRequestCode.IS_TARGETTING:
                    this.onHasActionRequested(ns, request, false);
                    break;
                default:
                    throw new Error("Could not identify the type of request.");
            }
            iteration++;
        } while (!requestPortHandle.empty() && iteration < CONSTANT.MAX_NUMBER_JOB_REQUESTS);
    }
    async onTargetRequested(ns, request) {
        const responsePortHandle = ns.getPortHandle(CONSTANT.JOB_MANAGER_RESPONSE_PORT);
        const response = {
            type: "Response",
            request,
            body: this.getCurrentTargets()
        };
        responsePortHandle.write(JSON.stringify(response));
    }
    async onHasActionRequested(ns, request, isPrep) {
        const responsePortHandle = ns.getPortHandle(CONSTANT.JOB_MANAGER_RESPONSE_PORT);
        const body = (isPrep) ? this.isPrepping(ns, request.body) : this.isTargetting(ns, request.body);
        let response = {
            type: "Response",
            request,
            body
        };
        responsePortHandle.write(JSON.stringify(response));
    }
    async managingLoop(ns, port) {
        const portHandle = ns.getPortHandle(port);
        if (portHandle.empty())
            return;
        const jobStrings = portHandle.data;
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
    finishJob(ns, id) {
        const index = this.jobs.findIndex(job => job.id === id);
        if (index === -1) {
            throw new Error("Could not find the job");
        }
        const job = this.jobs.splice(index, 1)[0];
        job.onFinish(ns);
    }
    isPrepping(ns, server) {
        return this.jobs.some((job) => {
            return job.target.host === server && job.isPrep;
        });
    }
    isTargetting(ns, server) {
        return this.jobs.some((job) => {
            return job.target.host === server && !job.isPrep;
        });
    }
    getCurrentTargets() {
        return [...new Set(this.jobs.map(job => job.target.host))];
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
