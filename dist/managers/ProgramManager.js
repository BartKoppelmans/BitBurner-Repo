import * as ControlFlowAPI from "/src/api/ControlFlowAPI.js";
import * as ServerAPI from "/src/api/ServerAPI.js";
import { Program, ProgramType } from "/src/classes/Program.js";
import { CONSTANT } from "/src/lib/constants.js";
import * as ProgramManagerUtils from "/src/util/ProgramManagerUtils.js";
import * as ServerUtils from "/src/util/ServerUtils.js";
import * as Utils from "/src/util/Utils.js";
class ProgramManager {
    constructor() {
        this.programs = [];
        this.obtainedPrograms = [];
    }
    async initialize(ns) {
        Utils.disableLogging(ns);
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
    async start(ns) {
        Utils.tprintColored(`Starting the ProgramManager`, true, CONSTANT.COLOR_INFORMATION);
        await this.startCheckingLoop(ns);
        await this.startRootLoop(ns);
    }
    async onDestroy(ns) {
        if (this.programPurchaseInterval) {
            clearInterval(this.programPurchaseInterval);
        }
        if (this.programCheckInterval) {
            clearInterval(this.programCheckInterval);
        }
        if (this.rootInterval) {
            clearInterval(this.rootInterval);
        }
        Utils.tprintColored(`Stopping the ProgramManager`, true, CONSTANT.COLOR_INFORMATION);
    }
    async startCheckingLoop(ns) {
        this.programCheckInterval = setInterval(this.checkingLoop.bind(this, ns), CONSTANT.PURCHASE_PROGRAM_LOOP_INTERVAL);
        await this.checkingLoop(ns);
    }
    async startPurchaseLoop(ns) {
        this.programPurchaseInterval = setInterval(this.purchaseLoop.bind(this, ns), CONSTANT.PURCHASE_PROGRAM_LOOP_INTERVAL);
        await this.purchaseLoop(ns);
    }
    async startRootLoop(ns) {
        this.rootInterval = setInterval(this.rootLoop.bind(this, ns), CONSTANT.ROOT_LOOP_INTERVAL);
        await this.rootLoop(ns);
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
            if (this.programPurchaseInterval)
                clearInterval(this.programPurchaseInterval);
            return;
        }
        const hasTor = await ProgramManagerUtils.hasDarkWeb(ns);
        if (!hasTor)
            return;
        let hasUpdated = false;
        programsToPurchase.forEach((program) => {
            hasUpdated = hasUpdated || program.attemptPurchase(ns);
        });
        if (hasUpdated)
            this.onProgramsUpdated(ns);
    }
    async rootLoop(ns) {
        await this.rootAllServers(ns);
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
    canRoot(ns, server) {
        if (!ServerUtils.isHackableServer(server)) {
            return false;
        }
        const hackableServer = server;
        return this.getNumCrackScripts(ns) >= hackableServer.staticHackingProperties.ports;
    }
    async root(ns, server) {
        if (server.isRooted(ns)) {
            throw new Error("Server is already rooted.");
        }
        // This also serves as a type check
        if (!this.canRoot(ns, server)) {
            throw new Error("Cannot crack the server.");
        }
        const hackableServer = server;
        const crackingScripts = this.getCrackingScripts(ns, hackableServer.staticHackingProperties.ports);
        crackingScripts.forEach(program => program.run(ns, server));
        ns.nuke(server.characteristics.host);
    }
    async rootAllServers(ns) {
        const serverMap = await ServerAPI.getServerMap(ns);
        // Root all servers 
        await Promise.all(serverMap.map(async (server) => {
            if (!server.isRooted(ns) && this.canRoot(ns, server)) {
                await this.root(ns, server);
            }
        }));
    }
    ;
    async onProgramsUpdated(ns) {
        await this.rootAllServers(ns);
    }
}
export async function main(ns) {
    const instance = new ProgramManager();
    await instance.initialize(ns);
    await instance.start(ns);
    while (true) {
        const shouldKill = await ControlFlowAPI.hasManagerKillRequest(ns);
        if (shouldKill) {
            await instance.onDestroy(ns);
            ns.exit();
        }
        await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL);
    }
}
