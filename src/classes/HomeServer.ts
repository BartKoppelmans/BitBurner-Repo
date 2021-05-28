import type { BitBurner as NS } from "Bitburner";
import Server from '/src/classes/Server.js';
import { CONSTANT } from "/src/lib/constants.js";

export default class HomeServer extends Server {
    private static instance: HomeServer;

    private constructor(ns: NS) {
        super(ns, CONSTANT.HOME_SERVER_HOST);
    }

    public static getInstance(ns: NS): HomeServer {
        if (!HomeServer.instance) {
            HomeServer.instance = new HomeServer(ns);
        }

        return HomeServer.instance;
    }
}