import type { BitBurner as NS, Port, PortHandle } from "Bitburner";
import Job from "/src/classes/Job.js";
import Server from "/src/classes/Server.js";
import { CONSTANT } from "/src/lib/constants.js";

let managingLoopIntervals: ReturnType<typeof setInterval>[] = [];
let jobs: Job[] = [];

export default class JobManager {
    private static instance: JobManager;

    private constructor() { }

    public static getInstance(): JobManager {
        if (!JobManager.instance) {
            JobManager.instance = new JobManager();
        }

        return JobManager.instance;
    }

    public async startManagingLoop(ns: NS): Promise<void> {

        // Clear the ports
        this.clearAllPorts(ns);

        if (managingLoopIntervals.length > 0) {
            for (const interval of managingLoopIntervals) {
                clearInterval(interval);
            }

            managingLoopIntervals = [];
        }

        const ports: Port[] = [...CONSTANT.JOB_PORT_NUMBERS];
        for (const port of ports) {
            const interval = setInterval(this.managingLoop.bind(this, ns, port), CONSTANT.JOB_MANAGING_LOOP_INTERVAL);
            managingLoopIntervals.push(interval);
            this.managingLoop(ns, port);
        }
    }

    private async managingLoop(ns: NS, port: Port): Promise<void> {
        const portHandle = ns.getPortHandle(port);

        if (portHandle.empty()) return;

        do {
            const jobString: string = portHandle.read().toString();

            const job: Job = Job.parseJobString(ns, jobString);

            jobs.push(job);
            job.onStart(ns);

            setTimeout(this.finishJob.bind(this, ns, job.id), job.end.getTime() - Date.now());

            await ns.sleep(CONSTANT.SMALL_DELAY);
        } while (!portHandle.empty());
    }

    public finishJob(ns: NS, id: number): void {
        const index: number = jobs.findIndex(job => job.id === id);

        if (index === -1) {
            throw new Error("Could not find the job");
        }

        const job: Job = jobs.splice(index, 1)[0];

        job.onFinish(ns);
    }

    public isPrepping(ns: NS, server: Server): boolean {
        return jobs.some((job: Job) => {
            return job.target === server && job.isPrep;
        });
    }

    public isTargetting(ns: NS, server: Server): boolean {
        return jobs.some((job: Job) => {
            return job.target === server && !job.isPrep;
        });
    }

    public getCurrentTargets(): string[] {
        return [...new Set(jobs.filter((job) => !job.isPrep).map(job => job.target.host))];
    }


    private clearAllPorts(ns: NS): void {
        const ports: Port[] = [...CONSTANT.JOB_PORT_NUMBERS];
        for (const port of ports) {
            const portHandle: PortHandle = ns.getPortHandle(port);
            portHandle.clear();
        }
    }
};