import HackableServer from '/src/classes/Server/HackableServer.js';
import Server from '/src/classes/Server/Server.js';
import { ServerType } from '/src/classes/Server/ServerInterfaces.js';
import { CONSTANT } from '/src/lib/constants.js';
import * as ServerUtils from '/src/util/ServerUtils.js';
import * as Utils from '/src/util/Utils.js';
import { PurchasedServer } from '/src/classes/Server/PurchasedServer.js';
import * as ServerAPI from '/src/api/ServerAPI.js';
import { HacknetServer } from '/src/classes/Server/HacknetServer.js';
class ServerMapRunner {
    static createLeafNode(ns, nodeName, id, parent) {
        let type;
        // Find the type of the server
        if (ServerUtils.isPurchased(nodeName))
            type = ServerType.PurchasedServer;
        else if (ServerUtils.isHacknet(nodeName))
            type = ServerType.HacknetServer;
        else if (ServerUtils.isDarkweb(nodeName))
            type = ServerType.DarkWebServer;
        else
            type = ServerType.HackableServer;
        const characteristics = {
            host: nodeName,
            type,
            id,
            treeStructure: {
                connections: [parent.characteristics.id],
                parent: parent.characteristics.id,
                children: [],
            },
        };
        const numberPattern = /\d+/g;
        switch (type) {
            case ServerType.HackableServer:
                return [new HackableServer(ns, {
                        characteristics,
                    })];
            case ServerType.HacknetServer:
                const hacknetServerMatch = nodeName.match(numberPattern);
                if (!hacknetServerMatch)
                    throw new Error('Could not get the id of the purchased server');
                const hacknetServerId = parseInt(hacknetServerMatch[0], 10);
                return [new HacknetServer(ns, {
                        characteristics: { ...characteristics, hacknetServerId },
                    })];
            case ServerType.PurchasedServer:
                const purchasedServerMatch = nodeName.match(numberPattern);
                if (!purchasedServerMatch)
                    throw new Error('Could not get the id of the purchased server');
                const purchasedServerId = parseInt(purchasedServerMatch[0], 10);
                return [new PurchasedServer(ns, {
                        characteristics: { ...characteristics, purchasedServerId },
                    })];
            default:
                return [new Server(ns, {
                        characteristics,
                    })];
        }
    }
    async run(ns) {
        ServerAPI.clearServerMap(ns);
        const servers = this.createServerList(ns);
        await ServerAPI.writeServerMap(ns, { servers, lastUpdated: new Date() });
    }
    createServerList(ns) {
        return this.spider(ns, CONSTANT.HOME_SERVER_ID, CONSTANT.HOME_SERVER_HOST);
    }
    spider(ns, id, nodeName, parent) {
        const tempServerMap = [];
        const queue = ns.scan(nodeName);
        if (parent) {
            const parentIndex = queue.indexOf(parent.characteristics.host);
            queue.splice(parentIndex, 1);
            if (queue.length === 0)
                return ServerMapRunner.createLeafNode(ns, nodeName, id, parent);
        }
        const subtreeNode = this.createSubtreeNode(ns, queue, nodeName, id, parent);
        tempServerMap.push(subtreeNode);
        // Loop through the current level
        queue.forEach((childNodeName, index) => {
            const childId = subtreeNode.characteristics.treeStructure.children[index];
            const children = this.spider(ns, childId, childNodeName, subtreeNode);
            tempServerMap.push(...children);
        });
        return tempServerMap;
    }
    createSubtreeNode(ns, queue, nodeName, id, parent) {
        const children = Array.from({ length: queue.length }, () => Utils.generateHash());
        const parentId = (parent) ? parent.characteristics.id : '';
        const characteristics = {
            id,
            type: (parent) ? ServerType.HackableServer : ServerType.HomeServer,
            host: nodeName,
            treeStructure: {
                connections: [...children, parentId],
                children,
                parent: parentId,
            },
        };
        return (parent) ? new HackableServer(ns, { characteristics }) : new Server(ns, { characteristics });
    }
}
export async function main(ns) {
    Utils.disableLogging(ns);
    await (new ServerMapRunner()).run(ns);
}
