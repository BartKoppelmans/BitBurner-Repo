import type { BitBurner as NS, Handle, Port } from "Bitburner";
import HackableServer from "/src/classes/HackableServer";
import Job from "/src/classes/Job.js";
import Server from "/src/classes/Server.js";
import { CONSTANT } from "/src/lib/constants.js";

export default class JobManager {
    private static instance: JobManager;

    private jobs: Job[] = [];

    private managingLoopIntervals: number[] = [];

    private constructor() { }

    public static getInstance(): JobManager {
        if (!JobManager.instance) {
            JobManager.instance = new JobManager();
        }

        return JobManager.instance;
    }

    public async startManagingLoop(ns: NS): Promise<void> {
        if (this.managingLoopIntervals.length > 0) {
            for (const interval of this.managingLoopIntervals) {
                clearInterval(interval);
            }
            this.managingLoopIntervals = [];
        }

        const ports: Port[] = [...CONSTANT.JOB_PORT_NUMBERS];

        for (const port of ports) {
            this.managingLoopIntervals.push(setInterval(this.managingLoop, CONSTANT.JOB_MANAGING_LOOP_INTERVAL, ns, port));
            this.managingLoop(ns, port);
        }
    }

    private async managingLoop(ns: NS, port: Port): Promise<void> {
        const portHandle = ns.getPortHandle(port);

        if (portHandle.empty()) return;

        do {
            const jobString: string = portHandle.read().toString();
            // TODO: Parse the job from the job string
            ns.tprint(jobString);

        } while (!portHandle.empty());
    }

    public startJob(ns: NS, job: Job): void {
        this.jobs.push(job);
        job.onStart(ns);

        setTimeout(this.finishJob, job.end.getTime() - Date.now(), ns, job.id);
    }

    public finishJob(ns: NS, id: number): void {
        const index: number = this.jobs.findIndex(job => job.id === id);

        if (index === -1) {
            throw new Error("Could not find the job");
        }

        const job: Job = this.jobs.splice(index, 1)[0];

        job.onFinish(ns);
    }

    public isPrepping(ns: NS, server: Server): boolean {
        return this.jobs.some((job: Job) => {
            return job.target === server && job.isPrep;
        });
    }

    public isTargetting(ns: NS, server: Server): boolean {
        return this.jobs.some((job: Job) => {
            return job.target === server && !job.isPrep;
        });
    }

    public getCurrentTargets(): HackableServer[] {
        const targets: HackableServer[] = [...new Set(this.jobs.map(job => job.target))];
        return targets;
    }


};