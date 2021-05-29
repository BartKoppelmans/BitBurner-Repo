import HackableServer from "/src/classes/HackableServer.js";
import Server from "/src/classes/Server.js";
import { Tools } from "/src/tools/Tools.js";

export interface HackArguments {
    isPrep?: boolean;

    hackId?: number;
}

export interface Hack {

    hackId: number;

    // The target of the hack
    target: HackableServer;

    // The servers where we are hacking from, and the number of threads
    threadSpread: Map<Server, number>;

    // The type of the hack
    tool: Tools;

    // Whether the hack is intended to prep the server
    isPrep: boolean;

    // The start of the hack
    start: Date;

    // The intended end of the hack
    end: Date;
}

export interface ScheduledHack {

    hackId: number;

    // The target of the hack
    target: HackableServer;

    // The total number of threads that would be optimal
    threads: number;

    // The type of the hack
    tool: Tools;

    // The start of the hack
    start: Date;

    // The intended end of the hack
    end: Date;
}

export interface Cycle {
    cycleNumber: number;

    target: HackableServer;

    hacks: ScheduledHack[];

    start: Date;

    end: Date;
}

// A Batch object contains a list of cycles that should be executed on a specific server
export interface Batch {
    target: HackableServer;

    cycles: Cycle[];

    start: Date;

    end: Date;
}