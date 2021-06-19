export class CodingContract {
    constructor(ns, filename, server) {
        this.filename = filename;
        this.server = server;
        this.type = ns.codingcontract.getContractType(filename, server.host);
        this.description = ns.codingcontract.getDescription(filename, server.host);
        this.data = ns.codingcontract.getData(filename, server.host);
    }
    attempt(ns, answer) {
        return ns.codingcontract.attempt(answer, this.filename, this.server.host);
    }
    toJSON() {
        return {
            filename: this.filename,
            server: this.server.host,
            type: this.type
        };
    }
}
