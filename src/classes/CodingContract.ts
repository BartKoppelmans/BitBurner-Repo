import type { BitBurner as NS, CodingContractTypes } from "Bitburner";
import Server from "/src/classes/Server.js";

export class CodingContract {
    filename: string;
    server: Server;
    type: CodingContractTypes;
    description: string;
    data: string;

    public constructor(ns: NS, filename: string, server: Server) {
        this.filename = filename;
        this.server = server;
        this.type = ns.codingcontract.getContractType(filename, server.host);
        this.description = ns.codingcontract.getDescription(filename, server.host);
        this.data = ns.codingcontract.getData(filename, server.host);
    }

    public attempt(ns: NS, answer: string | string[] | number): boolean {
        return ns.codingcontract.attempt(answer, this.filename, this.server.host);
    }

    public toJSON() {
        return {
            filename: this.filename,
            server: this.server.host,
            type: this.type
        };
    }
}