import type { BitBurner as NS } from "Bitburner";
import * as ControlFlowAPI from "/src/api/ControlFlowAPI.js";
import * as ServerAPI from "/src/api/ServerAPI.js";
import HackableServer from "/src/classes/HackableServer.js";
import { Program, ProgramType } from "/src/classes/Program.js";
import Server from "/src/classes/Server.js";
import { CONSTANT } from "/src/lib/constants.js";
import * as ProgramManagerUtils from "/src/util/ProgramManagerUtils.js";
import * as ServerUtils from "/src/util/ServerUtils.js";
import * as Utils from "/src/util/Utils.js";

class ProgramManager {
    private programs: Program[] = [];
    private obtainedPrograms: Program[] = [];

    private programPurchaseInterval?: ReturnType<typeof setInterval>;
    private programCheckInterval?: ReturnType<typeof setInterval>;
    private rootInterval?: ReturnType<typeof setInterval>;

    public constructor() { }

    public async initialize(ns: NS): Promise<void> {
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

    public async start(ns: NS): Promise<void> {
        Utils.tprintColored(`Starting the ProgramManager`, true, CONSTANT.COLOR_INFORMATION);

        await this.startCheckingLoop(ns);

        await this.startPurchaseLoop(ns);

        await this.startRootLoop(ns);
    }

    public async onDestroy(ns: NS): Promise<void> {
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

    private async startCheckingLoop(ns: NS): Promise<void> {
        this.programCheckInterval = setInterval(this.checkingLoop.bind(this, ns), CONSTANT.PURCHASE_PROGRAM_LOOP_INTERVAL);
        await this.checkingLoop(ns);
    }

    private async startPurchaseLoop(ns: NS): Promise<void> {
        this.programPurchaseInterval = setInterval(this.purchaseLoop.bind(this, ns), CONSTANT.PURCHASE_PROGRAM_LOOP_INTERVAL);
        await this.purchaseLoop(ns);
    }

    private async startRootLoop(ns: NS): Promise<void> {
        this.rootInterval = setInterval(this.rootLoop.bind(this, ns), CONSTANT.ROOT_LOOP_INTERVAL);
        await this.rootLoop(ns);
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
            if (this.programPurchaseInterval) clearInterval(this.programPurchaseInterval);
            return;
        }

        const hasTor: boolean = await ProgramManagerUtils.hasDarkWeb(ns);
        if (!hasTor) return;

        let hasUpdated: boolean = false;
        programsToPurchase.forEach((program) => {
            hasUpdated = hasUpdated || program.attemptPurchase(ns);
        });

        if (hasUpdated) this.onProgramsUpdated(ns);
    }

    private async rootLoop(ns: NS): Promise<void> {
        await this.rootAllServers(ns);
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

    private canRoot(ns: NS, server: Server) {
        if (!ServerUtils.isHackableServer(server)) {
            return false;
        }
        const hackableServer: HackableServer = server as HackableServer;
        return this.getNumCrackScripts(ns) >= hackableServer.staticHackingProperties.ports;
    }

    private async root(ns: NS, server: Server): Promise<void> {
        if (server.isRooted(ns)) {
            throw new Error("Server is already rooted.");
        }

        // This also serves as a type check
        if (!this.canRoot(ns, server)) {
            throw new Error("Cannot crack the server.");
        }

        const hackableServer: HackableServer = server as HackableServer;

        const crackingScripts: Program[] = this.getCrackingScripts(ns, hackableServer.staticHackingProperties.ports);

        crackingScripts.forEach(program => program.run(ns, server));

        ns.nuke(server.characteristics.host);
    }

    private async rootAllServers(ns: NS): Promise<void> {
        const serverMap: Server[] = await ServerAPI.getServerMap(ns);

        // Root all servers 
        await Promise.all(serverMap.map(async (server) => {
            if (!server.isRooted(ns) && this.canRoot(ns, server)) {
                await this.root(ns, server);
            }
        }));
    };

    private async onProgramsUpdated(ns: NS): Promise<void> {
        await this.rootAllServers(ns);
    }
}

export async function main(ns: NS) {
    const instance: ProgramManager = new ProgramManager();

    await instance.initialize(ns);
    await instance.start(ns);

    while (true) {
        const shouldKill: boolean = await ControlFlowAPI.hasManagerKillRequest(ns);

        if (shouldKill) {
            await instance.onDestroy(ns);
            ns.exit();
        }

        await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL);
    }
}