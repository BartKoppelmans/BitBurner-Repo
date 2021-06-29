import HackableServer from '/src/classes/HackableServer.js';
import Server from '/src/classes/Server.js';
import { ServerType } from "/src/interfaces/ServerInterfaces.js";
import { CONSTANT } from "/src/lib/constants.js";
import * as ServerUtils from "/src/util/ServerUtils.js";
export function spider(ns, id, nodeName, parent) {
    let tempServerMap = [];
    let queue = ns.scan(nodeName);
    if (parent) {
        const parentIndex = queue.indexOf(parent.characteristics.host);
        queue.splice(parentIndex, 1);
        // The current node is a leaf
        if (queue.length === 0) {
            let type;
            // Find the type of the server
            if (ServerUtils.isPurchased(nodeName))
                type = ServerType.PurchasedServer;
            else if (ServerUtils.isDarkweb(nodeName))
                type = ServerType.DarkWebServer;
            else
                type = ServerType.HackableServer;
            const characteristics = {
                host: nodeName,
                type,
                id
            };
            const treeStructure = {
                connections: [parent.characteristics.id],
                parent: parent.characteristics.id,
                children: []
            };
            return (type === ServerType.HackableServer) ? [new HackableServer(ns, characteristics, treeStructure)] : [new Server(ns, characteristics, treeStructure)];
        }
    }
    // The current node is a subtree node
    let subtreeNode;
    let characteristics;
    if (parent) {
        characteristics = { id, type: ServerType.HackableServer, host: nodeName };
        subtreeNode = new HackableServer(ns, characteristics, { parent: parent.characteristics.id });
    }
    else {
        characteristics = { id, type: ServerType.HomeServer, host: CONSTANT.HOME_SERVER_HOST };
        subtreeNode = new Server(ns, characteristics);
    }
    let currentId = id;
    // Loop through the current level
    queue.forEach((childNodeName) => {
        tempServerMap = [
            ...tempServerMap,
            ...spider(ns, currentId + 1, childNodeName, subtreeNode)
        ];
        currentId = Math.max.apply(Math, tempServerMap.map((server) => server.characteristics.id));
    });
    let children = tempServerMap.filter(node => queue.includes(node.characteristics.host));
    // Create the subtree structure
    let treeStructure;
    if (parent) {
        treeStructure = {
            connections: [...children.map((server) => server.characteristics.id), parent.characteristics.id],
            children: children.map((server) => server.characteristics.id),
            parent: parent.characteristics.id
        };
    }
    else {
        treeStructure = {
            connections: children.map((server) => server.characteristics.id),
            children: children.map((server) => server.characteristics.id)
        };
    }
    subtreeNode.updateTreeStructure(treeStructure);
    return [
        ...tempServerMap,
        subtreeNode
    ];
}
export function clearServerMap(ns) {
    ns.clear(CONSTANT.SERVER_MAP_FILENAME);
}
export function readServerMap(ns) {
    const serverMapString = ns.read(CONSTANT.SERVER_MAP_FILENAME).toString();
    const serverMapFile = JSON.parse(serverMapString);
    // TODO: Check whether the lastUpdated property was within a certain threshold (like a minute or so)
    const map = serverMapFile.serverMap;
    let serverMap = [];
    for (const server of map) {
        serverMap.push(parseServerObject(ns, server));
    }
    return serverMap;
}
function parseServerObject(ns, serverObject) {
    switch (+serverObject.characteristics.type) {
        case ServerType.HackableServer:
            return new HackableServer(ns, serverObject.characteristics, serverObject.treeStructure, serverObject.purpose, serverObject.status);
        case ServerType.BasicServer:
        case ServerType.HomeServer:
        case ServerType.PurchasedServer:
        case ServerType.DarkWebServer:
            return new Server(ns, serverObject.characteristics, serverObject.treeStructure, serverObject.purpose);
        default:
            throw new Error("Server type not recognized.");
    }
}
export function writeServerMap(ns, serverMap, lastUpdated) {
    const serverObject = { lastUpdated, serverMap };
    ns.write(CONSTANT.SERVER_MAP_FILENAME, JSON.stringify(serverObject), 'w');
}
;
