export default class BatchJob {
    constructor(ns, batchJob) {
        this.jobs = [];
        this.target = batchJob.target;
        this.batchId = batchJob.batchId;
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
}
