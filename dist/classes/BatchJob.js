export default class BatchJob {
    constructor(ns, batchJob) {
        this.jobs = [];
        this.target = batchJob.target;
        this.start = (batchJob.start) ? batchJob.start : new Date();
        if (batchJob.jobs) {
            // Sort the jobs to make sure that the last job is actually the last job
            this.jobs = batchJob.jobs.sort((jobA, jobB) => {
                return jobA.start.getTime() - jobB.start.getTime();
            });
            if (batchJob.end)
                this.end = batchJob.end;
            else {
                const lastJob = this.jobs[this.jobs.length - 1];
                this.end = lastJob.end;
            }
        }
        else
            this.end = new Date();
    }
    async addJobs(ns, jobs) {
        // TODO: Implement if necessary
    }
    async execute(ns) {
        await Promise.all(this.jobs.map(async (job) => job.execute(ns)));
    }
}
