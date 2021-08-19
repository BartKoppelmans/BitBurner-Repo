export default class BatchJob {
    constructor(ns, batchJob) {
        this.jobs = [];
        this.target = batchJob.target;
        this.batchId = batchJob.batchId;
        this.start = batchJob.start;
        this.end = batchJob.end;
        this.jobs = batchJob.jobs;
    }
    toJSON() {
        return {
            batchId: this.batchId,
            target: this.target,
            jobs: this.jobs,
            start: this.start,
            end: this.end,
        };
    }
}
