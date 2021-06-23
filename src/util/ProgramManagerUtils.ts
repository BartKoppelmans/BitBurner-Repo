import type { BitBurner as NS } from "Bitburner";
import * as ServerAPI from "/src/api/ServerAPI.js";
import Server from "/src/classes/Server.js";
import { CONSTANT } from "/src/lib/constants.js";
import * as ServerUtils from "/src/util/ServerUtils.js";

export async function hasDarkWeb(ns: NS): Promise<boolean> {
    const homeServer: Server = await ServerAPI.getServer(ns, CONSTANT.HOME_SERVER_ID);

    if (homeServer.treeStructure && homeServer.treeStructure.children) {
        return homeServer.treeStructure.children.some(async (id) => {
            const server: Server = await ServerAPI.getServer(ns, id);
            return ServerUtils.isDarkwebServer(server);
        });
    } else throw new Error("The server map has not been initialized yet.");
}
