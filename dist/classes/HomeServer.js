import Server from '/src/classes/Server.js';
import { CONSTANT } from "/src/lib/constants.js";
export default class HomeServer extends Server {
    constructor(ns) {
        super(ns, CONSTANT.HOME_SERVER_HOST);
        this.ram = ns.getServerRam(this.host)[0] - CONSTANT.DESIRED_HOME_FREE_RAM;
    }
    static getInstance(ns) {
        if (!HomeServer.instance) {
            HomeServer.instance = new HomeServer(ns);
        }
        return HomeServer.instance;
    }
    // We want to make sure that we always have some RAM left.
    getAvailableRam(ns) {
        const ram = super.getAvailableRam(ns);
        return Math.min(0, ram - CONSTANT.DESIRED_HOME_FREE_RAM);
    }
}
