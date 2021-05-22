import type { BitBurner as NS } from "Bitburner";
import HackableServer from "/src/classes/HackableServer.js";

export enum ProgramType {
    Crack,
    Util
}

export class Program {
    name: string;
    price: number;
    type: ProgramType;

    constructor(ns: NS, name: string, price: number, type: ProgramType) {
        this.name = name;
        this.price = price;
        this.type = type;
    }

    public hasProgram(ns: NS) {
        return ns.fileExists(this.name, "home");
    }

    public run(ns: NS, server: HackableServer) {
        this.getScriptFunction(ns)(server.host);
    }

    private getScriptFunction(ns: NS): Function {
        switch (this.name) {
            case "BruteSSH.exe":
                return ns.brutessh;
            case "FTPCrack.exe":
                return ns.ftpcrack;
            case "relaySMTP.exe":
                return ns.relaysmtp;
            case "HTTPWorm.exe":
                return ns.httpworm;
            case "SQLInject.exe":
                return ns.sqlinject;
            default:
                throw Error(`Program "${this.name}" not found.`);
        }
    }
}