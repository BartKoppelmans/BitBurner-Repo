import type { BitBurner as NS } from "Bitburner";
import HackableServer from "/src/classes/HackableServer.js";
import Job from "/src/classes/Job.js";
import Server from "/src/classes/Server.js";

class JobManager {
    private static instance: JobManager;

    private jobs: Job[] = [];
    private jobIdCounter: number = 0;

    public constructor() { }

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

    public getNextJobId(): number {
        return ++this.jobIdCounter;
    }

    public getCurrentTargets(): HackableServer[] {
        return [...new Set(this.jobs.map(job => job.target))];
    }

}

export const jobManager = new JobManager();