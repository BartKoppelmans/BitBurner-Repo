import HomeServer from "/src/classes/HomeServer.js";
import { Program, ProgramType } from "/src/classes/Program.js";
import { CONSTANT } from "/src/lib/constants.js";
import ServerManager from "/src/managers/ServerManager.js";
import ServerUtils from "/src/util/ServerUtils.js";
export class ProgramManager {
    constructor(ns) {
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
    async startpurchaseLoop(ns) {
        this.programInterval = setInterval(this.purchaseLoop, CONSTANT.PURCHASE_PROGRAM_LOOP_INTERVAL);
        this.purchaseLoop(ns);
    }
    async purchaseLoop(ns) {
        const programsToPurchase = this.programs.filter((program) => !program.hasProgram(ns));
        // We have bought all programs
        if (programsToPurchase.length === 0) {
            clearInterval(this.programInterval);
            return;
        }
        const hasTor = await this.hasTor(ns);
        if (!hasTor)
            return;
        programsToPurchase.forEach((program) => {
            program.attemptPurchase(ns);
        });
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
        if (!homeServer.treeStructure?.children) {
            await ServerManager.getInstance(ns).rebuildServerMap(ns);
            return this.hasTor(ns);
        }
        return homeServer.treeStructure?.children?.some((server) => ServerUtils.isDarkwebServer(server));
    }
}
