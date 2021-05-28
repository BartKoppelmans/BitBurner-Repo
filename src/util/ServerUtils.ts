import HackableServer from "/src/classes/HackableServer.js";
import Server from "/src/classes/Server.js";
import { CONSTANT } from "/src/lib/constants.js";

export default class ServerUtils {
    static isHomeServer(server: Server): boolean {
        return this.isHome(server.host);
    }

    static isHome(host: string): boolean {
        return (host === CONSTANT.HOME_SERVER_HOST);
    }

    static isDarkwebServer(server: Server) {
        return this.isDarkweb(server.host);
    }

    static isDarkweb(host: string): boolean {
        return (host === CONSTANT.DARKWEB_HOST);
    }

    static isPurchasedServer(server: Server): boolean {
        return this.isPurchased(server.host);
    }

    static isPurchased(host: string): boolean {
        return host.includes(CONSTANT.PURCHASED_SERVER_PREFIX);
    }

    static isHackableServer(server: Server): boolean {
        return (server.constructor.name === "HackableServer");
    }
}