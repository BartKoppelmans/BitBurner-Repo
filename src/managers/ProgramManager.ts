import type { BitBurner as NS } from "Bitburner";
import HackableServer from "/src/classes/HackableServer.js";
import HomeServer from "/src/classes/HomeServer.js";
import { Program, ProgramType } from "/src/classes/Program.js";
import Server from "/src/classes/Server.js";
import { CONSTANT } from "/src/lib/constants.js";
import * as ServerUtils from "/src/util/ServerUtils.js";
import * as ServerAPI from "/src/api/ServerAPI.js";

export default class ProgramManager {
    private static instance: ProgramManager;

    private programs: Program[];
    private obtainedPrograms: Program[] = [];

    private programPurchaseInterval?: number;
    private programCheckInterval?: number;

    private constructor(ns: NS) {
        this.programs = [
            new Program(ns, "BruteSSH.exe", 500000, ProgramType.Crack),
            new Program(ns, "FTPCrack.exe", 1500000, ProgramType.Crack),
            new Program(ns, "relaySMTP.exe", 5000000, ProgramType.Crack),
            new Program(ns, "HTTPWorm.exe", 30000000, ProgramType.Crack),
            new Program(ns, "SQLInject.exe", 250000000, ProgramType.Crack),
            new Program(ns, "DeepscanV1.exe", 500000, ProgramType.Util),
            new Program(ns, "DeepscanV2.exe", 25000000, ProgramType.Util),
            new Program(ns, "Autolink.exe", 1000000, ProgramType.Util),
        ];
    }

    public static getInstance(ns: NS): ProgramManager {
        if (!ProgramManager.instance) {
            ProgramManager.instance = new ProgramManager(ns);
        }

        return ProgramManager.instance;
    }

    public async startCheckingLoop(ns: NS): Promise<void> {
        this.programCheckInterval = setInterval(this.checkingLoop, CONSTANT.PURCHASE_PROGRAM_LOOP_INTERVAL);
        await this.checkingLoop(ns);
    }

    public async startpurchaseLoop(ns: NS): Promise<void> {
        this.programPurchaseInterval = setInterval(this.purchaseLoop, CONSTANT.PURCHASE_PROGRAM_LOOP_INTERVAL);
        await this.purchaseLoop(ns);
    }

    private async checkingLoop(ns: NS): Promise<void> {
        const obtainedPrograms: Program[] = this.programs.filter((program) => program.hasProgram(ns));

        const isUpToDate: boolean = obtainedPrograms.every((program: Program) => {
            return this.obtainedPrograms.includes(program);
        });

        if (!isUpToDate) {
            this.obtainedPrograms = obtainedPrograms;
            await this.onProgramsUpdated(ns);
        }
    }

    private async purchaseLoop(ns: NS): Promise<void> {

        const programsToPurchase: Program[] = this.programs.filter((program) => !program.hasProgram(ns));

        // We have bought all programs
        if (programsToPurchase.length === 0) {
            clearInterval(this.programPurchaseInterval);
            return;
        }

        const hasTor: boolean = await hasDarkWeb(ns);
        if (!hasTor) return;

        let hasUpdated: boolean = false;
        programsToPurchase.forEach((program) => {
            hasUpdated = hasUpdated || program.attemptPurchase(ns);
        });

        if (hasUpdated) this.onProgramsUpdated(ns);
    }

    public getNumCrackScripts(ns: NS): number {
        return this.programs.filter(program => program.type === ProgramType.Crack && program.hasProgram(ns)).length;
    }

    // Returns a sorted list of cracking scripts that can be used to root
    public getCrackingScripts(ns: NS, ports: number): Program[] {
        if (ports > this.getNumCrackScripts(ns)) {
            throw new Error("Not enough cracking scripts available.");
        }

        return this.programs
            .filter(program => program.type === ProgramType.Crack && program.hasProgram(ns))
            .sort((a, b) => a.price - b.price)
            .slice(0, ports);
    }

    private async onProgramsUpdated(ns: NS): Promise<void> {
        // We can't do this, but 
        // TODO: Find a solution for that
        // await ServerUtils.rootAllServers(ns);
    }


}

export async function hasDarkWeb(ns: NS): Promise<boolean> {
    const homeServer: HomeServer = await ServerAPI.getServer(ns, CONSTANT.HOME_SERVER_ID);

    if (homeServer.treeStructure && homeServer.treeStructure.children) {
        return homeServer.treeStructure.children.some(async (id) => {
            const server: Server = await ServerAPI.getServer(ns, id);
            return ServerUtils.isDarkwebServer(server);
        });
    } else throw new Error("The server map has not been initialized yet.");
}


export function isRooted(ns: NS, server: Server): boolean {
    return ns.hasRootAccess(server.host);
}

export function canRoot(ns: NS, server: Server) {
    if (!ServerUtils.isHackableServer(server)) {
        return false;
    }
    const hackableServer: HackableServer = server as HackableServer;
    return ProgramManager.getInstance(ns).getNumCrackScripts(ns) >= hackableServer.staticHackingProperties.ports;
}

export async function root(ns: NS, server: Server): Promise<void> {
    if (isRooted(ns, server)) {
        throw new Error("Server is already rooted.");
    }

    // This also serves as a type check
    if (!canRoot(ns, server)) {
        throw new Error("Cannot crack the server.");
    }

    const hackableServer: HackableServer = server as HackableServer;

    const crackingScripts: Program[] = ProgramManager.getInstance(ns).getCrackingScripts(ns, hackableServer.staticHackingProperties.ports);

    crackingScripts.forEach(program => program.run(ns, server));

    ns.nuke(server.host);
}