import type { BitBurner as NS, PurchaseableProgram } from "Bitburner";
import Server from "/src/classes/Server.js";
import { CONSTANT } from "/src/lib/constants.js";
import * as Utils from "/src/util/Utils.js";
import * as PlayerUtils from "/src/util/PlayerUtils.js";

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
        const money: number = PlayerUtils.getMoney(ns);

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
                return ns.brutessh(server.characteristics.host);
            case "FTPCrack.exe":
                return ns.ftpcrack(server.characteristics.host);
            case "relaySMTP.exe":
                return ns.relaysmtp(server.characteristics.host);
            case "HTTPWorm.exe":
                return ns.httpworm(server.characteristics.host);
            case "SQLInject.exe":
                return ns.sqlinject(server.characteristics.host);
            default:
                throw new Error(`Program "${this.name}" not found.`);
        }
    }
}