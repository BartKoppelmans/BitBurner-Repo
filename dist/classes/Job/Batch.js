import { CycleTask } from '/src/classes/Misc/HackInterfaces.js';
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
    getCycles() {
        const cycles = new Map();
        for (const job of this.jobs) {
            if (!job.cycleId)
                throw new Error('The batch is not an attack batch.');
            const currentCycle = (cycles.has(job.cycleId)) ? cycles.get(job.cycleId) : {};
            if (!currentCycle)
                throw new Error('The fuck happened here?');
            if (job.cycleTask === CycleTask.HACK)
                currentCycle.hack = job;
            if (job.cycleTask === CycleTask.WEAKEN1)
                currentCycle.weaken1 = job;
            if (job.cycleTask === CycleTask.GROWTH)
                currentCycle.growth = job;
            if (job.cycleTask === CycleTask.WEAKEN2)
                currentCycle.weaken2 = job;
            cycles.set(job.cycleId, currentCycle);
        }
        return Array.from(cycles.values());
    }
    getNumFinishedCycles() {
        const cycles = this.getCycles();
        return cycles.reduce((total, cycle) => {
            if (cycle.hack.finished && cycle.weaken1.finished && cycle.growth.finished && cycle.weaken2.finished) {
                return total + 1;
            }
            else
                return total;
        }, 0);
    }
    getNumCycles() {
        return this.jobs.length / 4;
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
