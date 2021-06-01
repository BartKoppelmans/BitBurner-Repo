import type { BitBurner as NS } from "Bitburner";
import HackableServer from "/src/classes/HackableServer.js";
import Job from "/src/classes/Job.js";
import { IBatchJob } from "/src/interfaces/JobInterfaces.js";

export default class BatchJob {

    target: HackableServer;
    jobs: Job[] = [];
    start: Date;
    end: Date;

    public constructor(ns: NS, batchJob: IBatchJob) {
        this.target = batchJob.target;
        this.start = (batchJob.start) ? batchJob.start : new Date();

        if (batchJob.jobs) {

            // Sort the jobs to make sure that the last job is actually the last job
            this.jobs = batchJob.jobs.sort((jobA: Job, jobB: Job) => {
                return jobA.start.getTime() - jobB.start.getTime();
            });

            if (batchJob.end) this.end = batchJob.end;
            else {
                const lastJob: Job = this.jobs[this.jobs.length - 1];
                this.end = lastJob.end;
            }
        } else this.end = new Date();
    }

    public async addJobs(ns: NS, jobs: Job[]): Promise<void> {
        // TODO: Implement if necessary
    }

    public async execute(ns: NS) {
        await Promise.all(this.jobs.map(async (job: Job) => job.execute(ns)));
    }

}