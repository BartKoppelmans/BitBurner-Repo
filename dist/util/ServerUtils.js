import { CONSTANT } from "/src/lib/constants.js";
export default class ServerUtils {
    static isHomeServer(server) {
        return this.isHome(server.host);
    }
    static isHome(host) {
        return (host === CONSTANT.HOME_SERVER_HOST);
    }
    static isDarkwebServer(server) {
        return this.isDarkweb(server.host);
    }
    static isDarkweb(host) {
        return (host === CONSTANT.DARKWEB_HOST);
    }
    static isPurchasedServer(server) {
        return this.isPurchased(server.host);
    }
    static isPurchased(host) {
        return host.includes(CONSTANT.PURCHASED_SERVER_PREFIX);
    }
    static isHackableServer(server) {
        return (server.constructor.name === "HackableServer");
    }
}
