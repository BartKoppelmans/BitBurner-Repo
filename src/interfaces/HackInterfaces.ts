import Job from "/src/classes/Job.js";

export interface HackSnapshot {
    optimalBatchCost: number;
    maxCycles: number;
}

export interface Cycle {
    hack: Job;
    weaken1: Job;
    growth: Job;
    weaken2: Job;
}

export interface CycleTimings {
    hack: {
        start: Date,
        end: Date;
    };
    weaken1: {
        start: Date,
        end: Date;
    };
    growth: {
        start: Date,
        end: Date;
    };
    weaken2: {
        start: Date,
        end: Date;
    };
}

export interface CycleThreads {
    hack: number;
    weaken1: number;
    growth: number;
    weaken2: number;
}