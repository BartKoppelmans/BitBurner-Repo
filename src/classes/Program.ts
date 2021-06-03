import type { BitBurner as NS, PurchaseableProgram } from "Bitburner";
import Server from "/src/classes/Server.js";
import { CONSTANT } from "/src/lib/constants";
import PlayerManager from "/src/managers/PlayerManager.js";
import Utils from "/src/util/Utils.js";

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

    // Returns whether it was successful
    public attemptPurchase(ns: NS): boolean {
        const playerManager: PlayerManager = PlayerManager.getInstance(ns);
        const money: number = playerManager.getMoney(ns);

        if (this.price > money) return false;

        const isSuccessful: boolean = ns.purchaseProgram(this.toValidString(ns, this.name));

        if (isSuccessful) {
            Utils.tprintColored(`Purchased ${this.name}`, true, CONSTANT.COLOR_INFORMATION);
        }

        return isSuccessful;
    }

    private toValidString(ns: NS, name: string): PurchaseableProgram {
        return (name.toLowerCase() as PurchaseableProgram);
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