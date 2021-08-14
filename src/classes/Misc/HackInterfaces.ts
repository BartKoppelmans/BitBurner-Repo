import Job    from '/src/classes/Job/Job.js'
import Server from '/src/classes/Server/Server.js'

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

export interface CycleThreadSpreads {
	hack: Map<Server, number>;
	weaken1: Map<Server, number>;
	growth: Map<Server, number>;
	weaken2: Map<Server, number>;

}