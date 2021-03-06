import * as LogAPI from '/src/api/LogAPI.js';
import * as PlayerUtils from '/src/util/PlayerUtils.js';
export var ProgramType;
(function (ProgramType) {
    ProgramType[ProgramType["Crack"] = 0] = "Crack";
    ProgramType[ProgramType["Util"] = 1] = "Util";
})(ProgramType || (ProgramType = {}));
export class Program {
    name;
    price;
    type;
    constructor(ns, name, price, type) {
        this.name = name;
        this.price = price;
        this.type = type;
    }
    static toValidString(name) {
        return name.toLowerCase();
    }
    hasProgram(ns) {
        return ns.fileExists(this.name, 'home');
    }
    // Returns whether it was successful
    attemptPurchase(ns) {
        const money = PlayerUtils.getMoney(ns);
        if (this.price > money)
            return false;
        const isSuccessful = ns.purchaseProgram(Program.toValidString(this.name));
        if (isSuccessful) {
            LogAPI.printTerminal(ns, `Purchased ${this.name}`);
        }
        return isSuccessful;
    }
    run(ns, server) {
        switch (this.name) {
            case 'BruteSSH.exe':
                return ns.brutessh(server.characteristics.host);
            case 'FTPCrack.exe':
                return ns.ftpcrack(server.characteristics.host);
            case 'relaySMTP.exe':
                return ns.relaysmtp(server.characteristics.host);
            case 'HTTPWorm.exe':
                return ns.httpworm(server.characteristics.host);
            case 'SQLInject.exe':
                return ns.sqlinject(server.characteristics.host);
            default:
                throw new Error(`Program "${this.name}" not found.`);
        }
    }
}
