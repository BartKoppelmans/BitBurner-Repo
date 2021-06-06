import HomeServer from "/src/classes/HomeServer.js";
import { CONSTANT } from "/src/lib/constants.js";
export function hasTor(ns) {
    const homeServer = HomeServer.getInstance(ns);
    if (homeServer.treeStructure && homeServer.treeStructure.children) {
        return homeServer.treeStructure.children.some((server) => isDarkwebServer(server));
    }
    else
        throw new Error("The server map has not been initialized yet.");
}
export function isDarkwebServer(server) {
    return isDarkweb(server.host);
}
export function isDarkweb(host) {
    return (host === CONSTANT.DARKWEB_HOST);
}
