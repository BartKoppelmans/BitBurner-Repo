import type { BitBurner as NS, Port, PortHandle } from "Bitburner";
import * as ControlFlowAPI from "/src/api/ControlFlowAPI.js";
import Job from "/src/classes/Job.js";
import { JobActionRequest, JobActionResponse, JobRequest, JobRequestCode, JobTargetsResponse } from "/src/interfaces/PortMessageInterfaces.js";
import { CONSTANT } from "/src/lib/constants.js";
import * as Utils from "/src/util/Utils.js";

export default class JobManager {

    private managingLoopIntervals: ReturnType<typeof setInterval>[] = [];
    private requestLoopInterval?: ReturnType<typeof setInterval>;
    private jobs: Job[] = [];

    public constructor() { }

    public async initialize(ns: NS) {
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

    public async start(ns: NS): Promise<void> {
        Utils.tprintColored(`Starting the JobManager`, true, CONSTANT.COLOR_INFORMATION);

        const ports: Port[] = [...CONSTANT.JOB_PORT_NUMBERS];
        for (const port of ports) {
            const interval = setInterval(this.managingLoop.bind(this, ns, port), CONSTANT.JOB_MANAGING_LOOP_INTERVAL);
            this.managingLoopIntervals.push(interval);
            this.managingLoop(ns, port);
        }

        this.requestLoopInterval = setInterval(this.requestLoop.bind(this, ns), CONSTANT.JOB_REQUEST_LOOP_INTERVAL);
    }

    public async onDestroy(ns: NS): Promise<void> {
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

    private async requestLoop(ns: NS): Promise<void> {
        const requestPortHandle = ns.getPortHandle(CONSTANT.JOB_MANAGER_REQUEST_PORT);
        if (requestPortHandle.empty()) return;

        const requestStrings: string[] = [...requestPortHandle.data] as string[];

        // This might give us some trouble
        // TODO: Assert that we have all the strings, otherwise we cut some off

        requestPortHandle.clear();

        // Process all job strings
        for (const requestString of requestStrings) {

            const request: JobRequest = JSON.parse(requestString);

            switch (+request.code) {
                case JobRequestCode.CURRENT_TARGETS:
                    this.onTargetRequested(ns, request);
                    break;
                case JobRequestCode.IS_PREPPING:
                    this.onHasActionRequested(ns, request as JobActionRequest, true);
                    break;
                case JobRequestCode.IS_TARGETTING:
                    this.onHasActionRequested(ns, request as JobActionRequest, false);
                    break;
                default:
                    throw new Error("Could not identify the type of request.");
            }
        }
    }

    private async onTargetRequested(ns: NS, request: JobRequest): Promise<void> {
        const responsePortHandle = ns.getPortHandle(CONSTANT.JOB_MANAGER_RESPONSE_PORT);

        const response: JobTargetsResponse = {
            type: "Response",
            request,
            body: this.getCurrentTargets()
        };

        responsePortHandle.write(JSON.stringify(response));
    }

    private async onHasActionRequested(ns: NS, request: JobActionRequest, isPrep: boolean): Promise<void> {
        const responsePortHandle = ns.getPortHandle(CONSTANT.JOB_MANAGER_RESPONSE_PORT);

        const body: boolean = (isPrep) ? this.isPrepping(ns, request.body) : this.isTargetting(ns, request.body);

        let response: JobActionResponse = {
            type: "Response",
            request,
            body
        };

        responsePortHandle.write(JSON.stringify(response));
    }

    private async managingLoop(ns: NS, port: Port): Promise<void> {
        const portHandle = ns.getPortHandle(port);

        if (portHandle.empty()) return;

        const jobStrings: string[] = [...portHandle.data] as string[];

        // This might give us some trouble
        // TODO: Assert that we have all the strings

        portHandle.clear();

        // Process all job strings
        for (const jobString of jobStrings) {
            const job: Job = Job.parseJobString(ns, jobString);

            this.jobs.push(job);
            job.onStart(ns);

            setTimeout(this.finishJob.bind(this, ns, job.id), job.end.getTime() - Date.now());
        }
    }

    private finishJob(ns: NS, id: number): void {
        const index: number = this.jobs.findIndex(job => job.id === id);

        if (index === -1) {
            throw new Error("Could not find the job");
        }

        const job: Job = this.jobs.splice(index, 1)[0];

        job.onFinish(ns);
    }

    private isPrepping(ns: NS, server: string): boolean {
        return this.jobs.some((job: Job) => {
            return job.target.host === server && job.isPrep;
        });
    }

    private isTargetting(ns: NS, server: string): boolean {
        return this.jobs.some((job: Job) => {
            return job.target.host === server && !job.isPrep;
        });
    }

    private getCurrentTargets(): string[] {
        return [...new Set(
            this.jobs.map(job => job.target.host)
        )];
    }


    private clearAllPorts(ns: NS): void {
        const ports: Port[] = [...CONSTANT.JOB_PORT_NUMBERS];
        for (const port of ports) {
            const portHandle: PortHandle = ns.getPortHandle(port);
            portHandle.clear();
        }
    }
};

export async function main(ns: NS) {
    if (ns.getHostname() !== 'home') {
        throw new Error('Run the script from home');
    }

    const instance: JobManager = new JobManager();

    await instance.initialize(ns);
    await instance.start(ns);

    while (true) {
        const shouldKill: boolean = await ControlFlowAPI.hasManagerKillRequest(ns);

        if (shouldKill) {
            await instance.onDestroy(ns);
            ns.exit();
        }

        await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL);
    }
}