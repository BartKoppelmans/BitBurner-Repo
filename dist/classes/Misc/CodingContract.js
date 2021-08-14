export class CodingContract {
    constructor(ns, filename, server) {
        this.filename = filename;
        this.server = server;
        this.type = ns.codingcontract.getContractType(filename, server.characteristics.host);
        this.description = ns.codingcontract.getDescription(filename, server.characteristics.host);
        this.data = ns.codingcontract.getData(filename, server.characteristics.host);
    }
    attempt(ns, answer) {
        return ns.codingcontract.attempt(answer, this.filename, this.server.characteristics.host);
    }
    toJSON() {
        return {
            filename: this.filename,
            server: this.server.characteristics.host,
            type: this.type,
        };
    }
}
