import HomeServer from "/src/classes/HomeServer.js";
import { Program, ProgramType } from "/src/classes/Program.js";
import { CONSTANT } from "/src/lib/constants.js";
import * as ServerUtils from "/src/util/ServerUtils.js";
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
        const hasTor = await this.hasTor(ns);
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
    async hasTor(ns) {
        const homeServer = HomeServer.getInstance(ns);
        if (homeServer.treeStructure && homeServer.treeStructure.children) {
            return homeServer.treeStructure.children.some((server) => ServerUtils.isDarkwebServer(server));
        }
        else
            throw new Error("The server map has not been initialized yet.");
    }
    async onProgramsUpdated(ns) {
        // await ProgramUtils.rootAllServers(ns);
    }
}
