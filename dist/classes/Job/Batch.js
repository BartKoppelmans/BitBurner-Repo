export default class Batch {
    constructor(ns, batch) {
        this.jobs = [];
        this.target = batch.target;
        this.batchId = batch.batchId;
        this.start = batch.start;
        this.end = batch.end;
        this.jobs = batch.jobs;
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
