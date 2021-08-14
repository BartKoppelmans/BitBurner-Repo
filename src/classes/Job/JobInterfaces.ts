import HackableServer from '/src/classes/Server/HackableServer.js'
import Job            from '/src/classes/Job/Job.js'
import Server         from '/src/classes/Server/Server.js'
import { Tools }      from '/src/tools/Tools.js'

export type ExecArguments = [script: string, host: string, numThreads?: number, ...args: string[]];

export interface ToolArguments {
	script: Tools;
	server: Server;
	threads: number;

	target: HackableServer; // ns.args[0]
	start: Date; // ns.args[1]
}

export interface IJOb {

	pids?: number[];

	id: string;

	cycleId?: string;

	batchId?: string

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

	threadSpread: Map<Server, number>;
}

// A Batch object contains a list of cycles that should be executed on a specific server
export interface IBatchJob {
	batchId: string;

	target: HackableServer;

	jobs?: JobList;

	start?: Date;

	end?: Date;
}

export interface JobMap {
	lastUpdated: Date;
	jobs: JobList;
}

export type JobList = Job[]