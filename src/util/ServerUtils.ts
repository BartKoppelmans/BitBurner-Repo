import Server from "/src/classes/Server.js";
import { CONSTANT } from "/src/lib/constants.js";

export function isHomeServer(server: Server): boolean {
    return isHome(server.host);
}

export function isHome(host: string): boolean {
    return (host === CONSTANT.HOME_SERVER_HOST);
}

export function isPurchasedServer(server: Server): boolean {
    return isPurchased(server.host);
}

export function isPurchased(host: string): boolean {
    return host.includes(CONSTANT.PURCHASED_SERVER_PREFIX);
}

export function isHackableServer(server: Server): boolean {
    return (server.constructor.name === "HackableServer");
}

export function isDarkwebServer(server: Server) {
    return isDarkweb(server.host);
}

export function isDarkweb(host: string): boolean {
    return (host === CONSTANT.DARKWEB_HOST);
}
