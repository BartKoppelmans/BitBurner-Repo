import { ServerType } from '/src/classes/Server/ServerInterfaces.js';
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
export function isHacknetServer(server) {
    return server.characteristics.type === ServerType.HacknetServer;
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
export function isHacknet(host) {
    return host.includes(CONSTANT.HACKNET_SERVER_PREFIX);
}
