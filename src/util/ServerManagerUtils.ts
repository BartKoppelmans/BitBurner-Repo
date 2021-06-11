import type { BitBurner as NS } from "Bitburner";
import Server from '/src/classes/Server.js';
import HackableServer from '/src/classes/HackableServer.js';
import PurchasedServer from '/src/classes/PurchasedServer.js';
import HomeServer from "/src/classes/HomeServer.js";
import { CONSTANT } from "/src/lib/constants.js";
import * as ServerUtils from "/src/util/ServerUtils.js";
import { ServerType, TreeStructure } from "/src/interfaces/ServerInterfaces.js";

export function spider(ns: NS, id: number, nodeName: string, parent?: Server): Server[] {
    let tempServerMap: Server[] = [];

    let queue: string[] = ns.scan(nodeName);

    if (parent) {
        const parentIndex: number = queue.indexOf(parent.host);
        queue.splice(parentIndex, 1);

        // The current node is a leaf
        if (queue.length === 0) {

            // If the node is a purchased server
            if (ServerUtils.isHome(parent.host) && ServerUtils.isPurchased(nodeName)) {
                // A purchased server
                return [new PurchasedServer(ns, id, nodeName)];
            }
            else if (ServerUtils.isHome(parent.host) && ServerUtils.isDarkweb(nodeName)) {
                // The darkweb server
                return [new Server(ns, id, nodeName)];
            }
            else {
                const treeStructure = {
                    connections: [parent.id],
                    parent: parent.id,
                    children: []
                };

                // Create hackable node
                return [new HackableServer(ns, id, nodeName, treeStructure)];
            }

        }
    }

    // The current node is a subtree node
    let subtreeNode: Server;
    if (parent) {
        subtreeNode = new HackableServer(ns, id, nodeName, { parent: parent.id });
    } else {
        subtreeNode = new HomeServer(ns);
    }


    let currentId = id;
    // Loop through the current level
    queue.forEach((childNodeName: string) => {
        tempServerMap = [
            ...tempServerMap,
            ...spider(ns, currentId + 1, childNodeName, subtreeNode)
        ];

        currentId = Math.max.apply(Math, tempServerMap.map((server) => server.id));
    });

    let children: Server[] = tempServerMap.filter(node => queue.includes(node.host));

    // Create the subtree structure
    let treeStructure: TreeStructure;
    if (parent) {
        treeStructure = {
            connections: [...children.map((server) => server.id), parent.id],
            children: children.map((server) => server.id),
            parent: parent.id
        };
    } else {
        treeStructure = {
            connections: children.map((server) => server.id),
            children: children.map((server) => server.id)
        };
    }

    subtreeNode.updateTree(treeStructure);

    return [
        ...tempServerMap,
        subtreeNode
    ];
}

export function clearServerMap(ns: NS): void {
    ns.clear(CONSTANT.SERVER_MAP_FILENAME);
}

export function readServerMap(ns: NS): Server[] {
    const serverMapString: string = ns.read(CONSTANT.SERVER_MAP_FILENAME).toString();
    const map: any[] = JSON.parse(serverMapString);

    let serverMap: Server[] = [];

    for (const server of map) {
        serverMap.push(parseServerObject(ns, server));
    }

    return serverMap;
}

function parseServerObject(ns: NS, serverObject: any): Server {
    switch (serverObject.type) {
        case ServerType.BasicServer:
            return new Server(ns, serverObject.id, serverObject.host, serverObject.treeStructure);
        case ServerType.HackableServer:
            return new HackableServer(ns, serverObject.id, serverObject.host, serverObject.treeStructure);
        case ServerType.HomeServer:
            return new HomeServer(ns, serverObject.treeStructure);
        case ServerType.PurchasedServer:
            return new PurchasedServer(ns, serverObject.id, serverObject.host);
        default:
            throw new Error("Server type not recognized.");
    }
}

export function writeServerMap(ns: NS, serverMap: Server[]): void {
    ns.write(CONSTANT.SERVER_MAP_FILENAME, JSON.stringify(serverMap), 'w');
};