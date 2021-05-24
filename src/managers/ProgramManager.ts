import type { BitBurner as NS } from "Bitburner";
import { Program, ProgramType } from "/src/classes/Program.js";

export class ProgramManager {
    private static instance: ProgramManager;

    private programs: Program[];

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
}