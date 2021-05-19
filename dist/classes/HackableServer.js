import ExternalServer from "./ExternalServer.js";
export default class HackableServer extends ExternalServer {
    // Dynamic values
    /*
    currentSecurityLevel: number
    currentMoney: number
    availableRam: number
    rooted: boolean
    hackable: boolean
    weakenTime: number
    growTime: number
    hackTime: number
    */
    constructor(ns, host, treeStructure) {
        super(ns, host, treeStructure);
    }
}
