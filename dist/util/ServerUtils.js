import { ServerType } from '/src/interfaces/ServerInterfaces.js';
import { CONSTANT } from '/src/lib/constants.js';
export function isHomeServer(server) {
    return server.characteristics.type === ServerType.HomeServer;
}
export function isPurchasedServer(server) {
    return server.characteristics.type === ServerType.PurchasedServer;
}
export function isHackableServer(server) {
    return (server.characteristics.type === ServerType.HackableServer);
}
export function isDarkwebServer(server) {
    return server.characteristics.type === ServerType.DarkWebServer;
}
export function isHome(host) {
    return (host === CONSTANT.HOME_SERVER_HOST);
}
export function isPurchased(host) {
    return host.includes(CONSTANT.PURCHASED_SERVER_PREFIX);
}
export function isDarkweb(host) {
    return (host === CONSTANT.DARKWEB_HOST);
}
