export var ProgramType;
(function (ProgramType) {
    ProgramType[ProgramType["Crack"] = 0] = "Crack";
    ProgramType[ProgramType["Util"] = 1] = "Util";
})(ProgramType || (ProgramType = {}));
export class Program {
    constructor(ns, name, price, type) {
        this.name = name;
        this.price = price;
        this.type = type;
    }
    hasProgram(ns) {
        return ns.fileExists(this.name, "home");
    }
    run(ns, server) {
        this.getScriptFunction(ns)(server.host);
    }
    getScriptFunction(ns) {
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
                throw new Error(`Program "${this.name}" not found.`);
        }
    }
}
