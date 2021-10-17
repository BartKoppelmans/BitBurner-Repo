export class CodingContract {
    filename;
    server;
    type;
    description;
    data;
    constructor(ns, filename, server) {
        this.filename = filename;
        this.server = server;
        this.type = ns.codingcontract.getContractType(filename, server.characteristics.host);
        this.description = ns.codingcontract.getDescription(filename, server.characteristics.host);
        this.data = ns.codingcontract.getData(filename, server.characteristics.host);
    }
    attempt(ns, answer) {
        const reward = ns.codingcontract.attempt(answer, this.filename, this.server.characteristics.host, { returnReward: true });
        if (reward === '')
            return { success: false };
        else
            return {
                success: true,
                reward,
            };
    }
    toJSON() {
        return {
            filename: this.filename,
            server: this.server.characteristics.host,
            type: this.type,
        };
    }
}
