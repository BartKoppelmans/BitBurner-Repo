import Server from '/src/classes/Server.js';
import { ServerType } from "/src/interfaces/ServerInterfaces.js";
import { CONSTANT } from "/src/lib/constants.js";
export default class HomeServer extends Server {
    constructor(ns, treeStructure) {
        super(ns, CONSTANT.HOME_SERVER_ID, CONSTANT.HOME_SERVER_HOST, treeStructure);
        this.type = ServerType.HomeServer;
        this.ram = ns.getServerRam(this.host)[0] - CONSTANT.DESIRED_HOME_FREE_RAM;
    }
    // We want to make sure that we always have some RAM left.
    getAvailableRam(ns) {
        const ram = super.getAvailableRam(ns);
        return Math.max(0, ram - CONSTANT.DESIRED_HOME_FREE_RAM);
    }
}
