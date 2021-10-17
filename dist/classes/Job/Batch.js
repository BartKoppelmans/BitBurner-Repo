export default class Batch {
    batchId;
    target;
    jobs;
    start;
    end;
    constructor(ns, batch) {
        this.target = batch.target;
        this.batchId = batch.batchId;
        this.start = batch.start;
        this.end = batch.end;
        this.jobs = batch.jobs.sort((a, b) => a.end.getTime() - b.end.getTime());
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
