import type { BitBurner as NS } from "Bitburner";
import Server from "/src/classes/Server.js";

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

    public run(ns: NS, server: Server) {
        switch (this.name) {
            case "BruteSSH.exe":
                return ns.brutessh(server.host);
            case "FTPCrack.exe":
                return ns.ftpcrack(server.host);
            case "relaySMTP.exe":
                return ns.relaysmtp(server.host);
            case "HTTPWorm.exe":
                return ns.httpworm(server.host);
            case "SQLInject.exe":
                return ns.sqlinject(server.host);
            default:
                throw new Error(`Program "${this.name}" not found.`);
        }
    }
}