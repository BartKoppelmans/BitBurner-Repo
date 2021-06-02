import type { BitBurner as NS } from "Bitburner";
import Server from '/src/classes/Server.js';
import { CONSTANT } from "/src/lib/constants.js";

export default class HomeServer extends Server {
    private static instance: HomeServer;

    private constructor(ns: NS) {
        super(ns, CONSTANT.HOME_SERVER_HOST);
        this.ram = ns.getServerRam(this.host)[0] - CONSTANT.DESIRED_HOME_FREE_RAM;
    }

    public static getInstance(ns: NS): HomeServer {
        if (!HomeServer.instance) {
            HomeServer.instance = new HomeServer(ns);
        }

        return HomeServer.instance;
    }

    // We want to make sure that we always have some RAM left.
    public getAvailableRam(ns: NS): number {
        const ram = super.getAvailableRam(ns);
        return ram - CONSTANT.DESIRED_HOME_FREE_RAM;
    }
}