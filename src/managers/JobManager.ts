import type { BitBurner as NS } from "Bitburner";
import HackableServer from "/src/classes/HackableServer.js";
import Job from "/src/classes/Job.js";
import Server from "/src/classes/Server.js";

let jobs: Job[] = [];
let jobIdCounter: number = 0;

export default class JobManager {
    private static instance: JobManager;

    private constructor() { }

    public static getInstance(): JobManager {
        if (!JobManager.instance) {
            JobManager.instance = new JobManager();
        }

        return JobManager.instance;
    }

    public startJob(ns: NS, job: Job): void {
        jobs.push(job);
        job.onStart(ns);

        setTimeout(this.finishJob, job.end.getTime() - Date.now(), ns, job.id);
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

    public getNextJobId(): number {
        return ++jobIdCounter;
    }

    public getCurrentTargets(): HackableServer[] {
        return [...new Set(jobs.map(job => job.target))];;
    }


};