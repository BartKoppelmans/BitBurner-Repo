import HackableServer from "/src/classes/HackableServer.js";
import Job from "/src/classes/Job.js";
import Server from "/src/classes/Server.js";
import { Tools } from "/src/tools/Tools.js";

export type ExecArguments = [script: string, host: string, numThreads?: number, ...args: string[]];

export interface ToolArguments {
    script: Tools;
    server: Server;
    threads: number;

    target: HackableServer; // ns.args[0]
    start: Date; // ns.args[1]
}

export interface IJOb {

    id?: number;

    cycleId?: string;

    // The target of the hack
    target: HackableServer;

    // The servers where we are hacking from, and the number of threads
    threads: number;

    // The type of the hack
    tool: Tools;

    // The start of the hack
    start?: Date;

    // The intended end of the hack
    end?: Date;

    isPrep: boolean;

    allowSpreading?: boolean;

    threadSpread?: Map<Server, number>;
}

// A Batch object contains a list of cycles that should be executed on a specific server
export interface IBatchJob {
    target: HackableServer;

    jobs?: Job[];

    start?: Date;

    end?: Date;
}