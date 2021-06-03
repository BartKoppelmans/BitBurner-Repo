import HomeServer from "/src/classes/HomeServer.js";
import ServerManager from "/src/managers/ServerManager.js";
import * as ServerUtils from "/src/util/ServerUtils.js";
export async function hasTor(ns) {
    const homeServer = HomeServer.getInstance(ns);
    if (homeServer.treeStructure && homeServer.treeStructure.children) {
        return homeServer.treeStructure.children.some((server) => ServerUtils.isDarkwebServer(server));
    }
    else
        throw new Error("The server map has not been initialized yet.");
}
export async function rootAllServers(ns) {
    const serverManager = ServerManager.getInstance(ns);
    const serverMap = await serverManager.getServerMap(ns, true);
    // Root all servers 
    await Promise.all(serverMap.map(async (server) => {
        if (!ServerUtils.isRooted(ns, server) && ServerUtils.canRoot(ns, server)) {
            await ServerUtils.root(ns, server);
        }
    }));
}
