import { Program, ProgramType } from "/src/classes/Program.js";
import { CONSTANT } from "/src/lib/constants.js";
import * as ServerUtils from "/src/util/ServerUtils.js";
import * as ServerAPI from "/src/api/ServerAPI.js";
export default class ProgramManager {
    constructor(ns) {
        this.obtainedPrograms = [];
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
    static getInstance(ns) {
        if (!ProgramManager.instance) {
            ProgramManager.instance = new ProgramManager(ns);
        }
        return ProgramManager.instance;
    }
    async startCheckingLoop(ns) {
        this.programCheckInterval = setInterval(this.checkingLoop, CONSTANT.PURCHASE_PROGRAM_LOOP_INTERVAL);
        await this.checkingLoop(ns);
    }
    async startpurchaseLoop(ns) {
        this.programPurchaseInterval = setInterval(this.purchaseLoop, CONSTANT.PURCHASE_PROGRAM_LOOP_INTERVAL);
        await this.purchaseLoop(ns);
    }
    async checkingLoop(ns) {
        const obtainedPrograms = this.programs.filter((program) => program.hasProgram(ns));
        const isUpToDate = obtainedPrograms.every((program) => {
            return this.obtainedPrograms.includes(program);
        });
        if (!isUpToDate) {
            this.obtainedPrograms = obtainedPrograms;
            await this.onProgramsUpdated(ns);
        }
    }
    async purchaseLoop(ns) {
        const programsToPurchase = this.programs.filter((program) => !program.hasProgram(ns));
        // We have bought all programs
        if (programsToPurchase.length === 0) {
            clearInterval(this.programPurchaseInterval);
            return;
        }
        const hasTor = await hasDarkWeb(ns);
        if (!hasTor)
            return;
        let hasUpdated = false;
        programsToPurchase.forEach((program) => {
            hasUpdated = hasUpdated || program.attemptPurchase(ns);
        });
        if (hasUpdated)
            this.onProgramsUpdated(ns);
    }
    getNumCrackScripts(ns) {
        return this.programs.filter(program => program.type === ProgramType.Crack && program.hasProgram(ns)).length;
    }
    // Returns a sorted list of cracking scripts that can be used to root
    getCrackingScripts(ns, ports) {
        if (ports > this.getNumCrackScripts(ns)) {
            throw new Error("Not enough cracking scripts available.");
        }
        return this.programs
            .filter(program => program.type === ProgramType.Crack && program.hasProgram(ns))
            .sort((a, b) => a.price - b.price)
            .slice(0, ports);
    }
    async onProgramsUpdated(ns) {
        // We can't do this, but 
        // TODO: Find a solution for that
        // await ServerUtils.rootAllServers(ns);
    }
}
export async function hasDarkWeb(ns) {
    const homeServer = await ServerAPI.getServer(ns, CONSTANT.HOME_SERVER_ID);
    if (homeServer.treeStructure && homeServer.treeStructure.children) {
        return homeServer.treeStructure.children.some(async (id) => {
            const server = await ServerAPI.getServer(ns, id);
            return ServerUtils.isDarkwebServer(server);
        });
    }
    else
        throw new Error("The server map has not been initialized yet.");
}
export function isRooted(ns, server) {
    return ns.hasRootAccess(server.host);
}
export function canRoot(ns, server) {
    if (!ServerUtils.isHackableServer(server)) {
        return false;
    }
    const hackableServer = server;
    return ProgramManager.getInstance(ns).getNumCrackScripts(ns) >= hackableServer.staticHackingProperties.ports;
}
export async function root(ns, server) {
    if (isRooted(ns, server)) {
        throw new Error("Server is already rooted.");
    }
    // This also serves as a type check
    if (!canRoot(ns, server)) {
        throw new Error("Cannot crack the server.");
    }
    const hackableServer = server;
    const crackingScripts = ProgramManager.getInstance(ns).getCrackingScripts(ns, hackableServer.staticHackingProperties.ports);
    crackingScripts.forEach(program => program.run(ns, server));
    ns.nuke(server.host);
}
