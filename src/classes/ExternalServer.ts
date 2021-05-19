import type { BitBurner as NS } from "Bitburner"
import Server, { TreeStructure } from "./Server";

export default class ExternalServer extends Server {
    // Static values
    ports: number;
    hackingLevel: number;
    maxMoney: number;
    growth: number;
    minSecurityLevel: number;
    baseSecurityLevel: number;
    ram: number;
    files: string[];

    public constructor(ns: NS, host: string, treeStructure?: TreeStructure) {
        super(host, treeStructure);

        this.ports = ns.getServerNumPortsRequired(host);
        this.hackingLevel = ns.getServerRequiredHackingLevel(host);
        this.maxMoney = ns.getServerMaxMoney(host);
        this.growth = ns.getServerGrowth(host);
        this.minSecurityLevel = ns.getServerMinSecurityLevel(host);
        this.baseSecurityLevel = ns.getServerBaseSecurityLevel(host);
        this.ram = ns.getServerRam(host)[0];
        this.files = ns.ls(host);
    }
}