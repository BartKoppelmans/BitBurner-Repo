import type { BitBurner as NS } from "Bitburner"
import Server from './Server.js'

export default class HomeServer extends Server {
    private static instance: HomeServer;

    private constructor() {
        super('home');
    }

    public static getInstance(): HomeServer {
        if (!HomeServer.instance) {
            HomeServer.instance = new HomeServer();
        }

        return HomeServer.instance;
    }

    public isHome() {
        return true;
    }

}