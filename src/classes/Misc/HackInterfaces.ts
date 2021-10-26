import Server from '../Server/Server.js'
import Job    from '/src/classes/Job/Job.js'

export interface HackSnapshot {
	optimalBatchCost: number;
	maxCycles: number;
}

export type ThreadSpread = Map<string, number>;

export interface CycleSpread {
	source: Server,
	numCycles: number
}

export interface PrepEffect {
	source: Server,
	threads: number,
	amount: number
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

export interface CycleThreadSpreads {
	hack: ThreadSpread
	weaken1: ThreadSpread
	growth: ThreadSpread
	weaken2: ThreadSpread
}

export enum CycleTask {
	HACK = 'hack',
	WEAKEN1 = 'weaken1',
	GROWTH = 'growth',
	WEAKEN2 = 'weaken2',
}