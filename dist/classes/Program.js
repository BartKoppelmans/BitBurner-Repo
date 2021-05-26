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
