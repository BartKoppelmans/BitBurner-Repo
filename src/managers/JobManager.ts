import type { BitBurner as NS, Port, PortHandle } from "Bitburner";
import * as ControlFlowAPI from "/src/api/ControlFlowAPI.js";
import * as ServerAPI from "/src/api/ServerAPI.js";
import BatchJob from "/src/classes/BatchJob.js";
import Job from "/src/classes/Job.js";
import { JobMessageCode, JobMessageRequest, JobMessageResponse } from "/src/interfaces/PortMessageInterfaces.js";
import { ServerStatus } from "/src/interfaces/ServerInterfaces.js";
import { CONSTANT } from "/src/lib/constants.js";
import * as Utils from "/src/util/Utils.js";

export default class JobManager {

    private managingLoopIntervals: ReturnType<typeof setInterval>[] = [];
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
    }

    public async start(ns: NS): Promise<void> {
        Utils.tprintColored(`Starting the JobManager`, true, CONSTANT.COLOR_INFORMATION);

        const ports: Port[] = [...CONSTANT.JOB_PORT_NUMBERS];
        for (const port of ports) {
            const interval = setInterval(this.managingLoop.bind(this, ns, port), CONSTANT.JOB_MANAGING_LOOP_INTERVAL);
            this.managingLoopIntervals.push(interval);
            this.managingLoop(ns, port);
        }
    }

    public async onDestroy(ns: NS): Promise<void> {
        this.clearAllPorts(ns);

        if (this.managingLoopIntervals.length > 0) {
            for (const interval of this.managingLoopIntervals) {
                clearInterval(interval);
            }

            this.managingLoopIntervals = [];
        }

        Utils.tprintColored(`Stopping the JobManager`, true, CONSTANT.COLOR_INFORMATION);
    }

    private async managingLoop(ns: NS, port: Port): Promise<void> {
        const requestPortHandle = ns.getPortHandle(port);
        const responsePortHandle = ns.getPortHandle(CONSTANT.JOB_RESPONSE_PORT);

        if (requestPortHandle.empty()) return;

        const requestStrings: string[] = [...requestPortHandle.data] as string[];

        // This might give us some trouble
        // TODO: Assert that we have all the strings

        requestPortHandle.clear();

        // Process all job strings
        for (const requestString of requestStrings) {
            const request: JobMessageRequest = JSON.parse(requestString);

            switch (+request.code) {
                case JobMessageCode.NEW_JOB:
                    const job: Job = Job.parseJobString(ns, request.body);
                    await this.startJob(ns, job, false);
                    break;
                case JobMessageCode.NEW_BATCH_JOB:
                    const batchJob: BatchJob = BatchJob.parseBatchJobString(ns, request.body);
                    await this.startBatchJob(ns, batchJob);
                    break;
                default:
                    throw new Error("We did not recognize the JobMessageCode");
            }

            const response: JobMessageResponse = {
                type: "Response",
                request
            };
            responsePortHandle.write(JSON.stringify(response));
        }
    }

    private async startBatchJob(ns: NS, batchJob: BatchJob): Promise<void> {
        const status: ServerStatus = (batchJob.jobs[0].isPrep) ? ServerStatus.PREPPING : ServerStatus.TARGETTING;
        await ServerAPI.updateStatus(ns, batchJob.target, status);

        for await (const job of batchJob.jobs) {
            await this.startJob(ns, job, true);
        }
    }

    private async startJob(ns: NS, job: Job, wasBatchJob: boolean): Promise<void> {
        this.jobs.push(job);

        if (!wasBatchJob) {
            const status: ServerStatus = (job.isPrep) ? ServerStatus.PREPPING : ServerStatus.TARGETTING;
            await ServerAPI.updateStatus(ns, job.target, status);
        }

        await job.execute(ns);
        job.onStart(ns);

        setTimeout(this.finishJob.bind(this, ns, job.id), job.end.getTime() - Date.now());
    }

    private async finishJob(ns: NS, id: number): Promise<void> {
        const index: number = this.jobs.findIndex(job => job.id === id);

        if (index === -1) {
            throw new Error("Could not find the job");
        }

        const job: Job = this.jobs.splice(index, 1)[0];

        const otherJobIndex: number = this.jobs.findIndex((job) => job.target.characteristics.host === job.target.characteristics.host);

        if (otherJobIndex === -1) {
            await ServerAPI.updateStatus(ns, job.target, ServerStatus.NONE);
        }

        job.onFinish(ns);
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