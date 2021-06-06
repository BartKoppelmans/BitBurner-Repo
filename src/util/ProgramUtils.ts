import type { BitBurner as NS } from "Bitburner";
import HomeServer from "/src/classes/HomeServer.js";
import Server from "/src/classes/Server.js";
import { CONSTANT } from "/src/lib/constants.js";

export function hasTor(ns: NS): boolean {
    const homeServer: HomeServer = HomeServer.getInstance(ns);

    if (homeServer.treeStructure && homeServer.treeStructure.children) {
        return homeServer.treeStructure.children.some((server) => isDarkwebServer(server));
    } else throw new Error("The server map has not been initialized yet.");
}

export function isDarkwebServer(server: Server) {
    return isDarkweb(server.host);
}

export function isDarkweb(host: string): boolean {
    return (host === CONSTANT.DARKWEB_HOST);
}