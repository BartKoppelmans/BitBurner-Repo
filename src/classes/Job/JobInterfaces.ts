import HackableServer              from '/src/classes/Server/HackableServer.js'
import Job                         from '/src/classes/Job/Job.js'
import { Tools }                   from '/src/tools/Tools.js'
import Batch                       from '/src/classes/Job/Batch.js'
import { CycleTask, ThreadSpread } from '/src/classes/Misc/HackInterfaces.js'

export type ExecArguments = [script: string, host: string, numThreads?: number, ...args: string[]];

export interface ToolArguments {
	script: Tools;
	server: string;
	threads: number;

	target: HackableServer; // ns.args[0]
	start: Date; // ns.args[1]
}

export interface IJOb {

	pids?: number[];

	batchId: string;
	cycleId?: string;
	cycleTask?: CycleTask

	id: string;

	// The target of the hack
	target: HackableServer;

	// The servers where we are hacking from, and the number of threads
	threads: number;

	// The type of the hack
	tool: Tools;

	// The start of the hack
	start: Date;

	// The intended end of the hack
	end: Date;

	isPrep: boolean;

	threadSpread: ThreadSpread

	finished?: boolean;
}

// A Batch object contains a list of cycles that should be executed on a specific server
export interface IBatch {
	batchId: string;

	target: HackableServer;

	jobs: Job[];

	start: Date;

	end: Date;
}

export interface JobMap {
	lastUpdated: Date;
	batches: Batch[];
}