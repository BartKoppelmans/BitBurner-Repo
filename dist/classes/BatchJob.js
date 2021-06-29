import HackableServer from "/src/classes/HackableServer.js";
import Job from "/src/classes/Job.js";
export default class BatchJob {
    constructor(ns, batchJob) {
        this.jobs = [];
        this.target = batchJob.target;
        if (batchJob.jobs) {
            // Sort the jobs to make sure that the last job is actually the last job
            this.jobs = batchJob.jobs.sort((jobA, jobB) => {
                return jobA.start.getTime() - jobB.start.getTime();
            });
            this.start = (batchJob.start) ? batchJob.start : this.jobs[0].start;
            if (batchJob.end)
                this.end = batchJob.end;
            else {
                const lastJob = this.jobs[this.jobs.length - 1];
                this.end = lastJob.end;
            }
        }
        else {
            this.start = (batchJob.start) ? batchJob.start : new Date();
            this.end = (batchJob.end) ? batchJob.end : new Date();
        }
    }
    async addJobs(ns, jobs) {
        // TODO: Implement if necessary
    }
    async execute(ns) {
        await Promise.all(this.jobs.map(async (job) => job.execute(ns)));
    }
    static parseBatchJobString(ns, batchJobString) {
        const object = JSON.parse(batchJobString);
        const jobs = object.jobs.map((s) => Job.parseJobString(ns, JSON.stringify(s)));
        const target = new HackableServer(ns, object.target.characteristics, object.target.treeStructure, object.target.purpose);
        return new BatchJob(ns, {
            target,
            jobs,
            start: new Date(object.start),
            end: new Date(object.end),
        });
    }
}
