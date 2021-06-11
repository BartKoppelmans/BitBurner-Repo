import { CONSTANT } from "/src/lib/constants.js";
export function isHomeServer(server) {
    return isHome(server.host);
}
export function isHome(host) {
    return (host === CONSTANT.HOME_SERVER_HOST);
}
export function isPurchasedServer(server) {
    return isPurchased(server.host);
}
export function isPurchased(host) {
    return host.includes(CONSTANT.PURCHASED_SERVER_PREFIX);
}
export function isHackableServer(server) {
    return (server.constructor.name === "HackableServer");
}
export function isDarkwebServer(server) {
    return isDarkweb(server.host);
}
export function isDarkweb(host) {
    return (host === CONSTANT.DARKWEB_HOST);
}
