import { CONSTANT } from '/src/lib/constants.js';
export class JobStorage {
    lastUpdated = CONSTANT.EPOCH_DATE;
    batches = [];
    constructor(jobmap) {
        if (jobmap) {
            this.batches = jobmap.batches;
            this.lastUpdated = jobmap.lastUpdated;
        }
    }
    static isBatchFinished(batch) {
        return batch.jobs.every((job) => job.finished);
    }
    getJobMap() {
        return {
            batches: this.batches,
            lastUpdated: this.lastUpdated,
        };
    }
    addBatch(batch) {
        this.batches.push(batch);
        this.processUpdate();
    }
    removeBatch(batch) {
        const index = this.batches.findIndex((b) => b.batchId === batch.batchId);
        if (index === -1)
            return false;
        this.batches.splice(index);
        this.processUpdate();
        return true;
    }
    setJobStatus(job, finished) {
        const batchIndex = this.batches.findIndex((b) => b.batchId === job.batchId);
        if (batchIndex === -1)
            return false;
        const jobIndex = this.batches[batchIndex].jobs.findIndex((j) => j.id === job.id);
        if (jobIndex === -1)
            return false;
        this.batches[batchIndex].jobs[jobIndex].finished = finished;
        this.processUpdate();
        return true;
    }
    clear() {
        this.batches = [];
        this.processUpdate();
    }
    getServerBatch(server) {
        const batch = this.batches.find((b) => b.target.characteristics.host === server.characteristics.host);
        if (!batch)
            return null;
        return batch;
    }
    processUpdate() {
        this.lastUpdated = new Date();
    }
}
