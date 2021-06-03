import ServerManager from "/src/managers/ServerManager.js";
import * as ServerUtils from "/src/util/ServerUtils.js";
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
