import Server from "./Server";
export default class ExternalServer extends Server {
    constructor(ns, host, treeStructure) {
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
