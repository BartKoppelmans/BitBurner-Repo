import type { BitBurner as NS } from "Bitburner"
import Server, { TreeStructure } from '/src/classes/Server.js'
import HackableServer from '/src/classes/HackableServer.js'
import PurchasedServer from '/src/classes/PurchasedServer.js'
import HomeServer from "/src/classes/HomeServer.js";

export class ServerManager {
    serverMap: Server[];
    lastUpdated?: Date;

    constructor(ns: NS) {
        this.serverMap = this.buildServerMap(ns);
    }

    private buildServerMap(ns: NS): Server[] {
        const hostName = ns.getHostname();
        if (hostName !== 'home') {
            throw new Error('Run the script from home');
        }

        let serverMap: Server[] = this.spider(ns, hostName);
        this.lastUpdated = new Date();
        return serverMap;
    }

    public rebuildServerMap(ns: NS) {
        this.serverMap = this.buildServerMap(ns);
    }

    private spider(ns: NS, nodeName: string, parent?: Server): Server[] {
        let tempServerMap: Server[] = [];

        let queue: string[] = ns.scan(nodeName);

        if (parent) {
            const parentIndex: number = queue.indexOf(parent.host);
            queue.splice(parentIndex);

            // The current node is a leaf
            if (queue.length == 0) {

                // If the node is a purchased server
                if (parent.isHome() && Server.isPurchasedServer(nodeName)) {
                    return [new PurchasedServer(ns, nodeName)];
                } else {
                    const treeStructure = {
                        connections: [parent],
                        parent: parent,
                        children: []
                    }

                    // Create hackable node
                    return [new HackableServer(ns, nodeName, treeStructure)]
                }

            }
        }

        // The current node is a subtree node
        let subtreeNode: Server
        if (parent) {
            subtreeNode = new HackableServer(ns, nodeName, { parent: parent })
        } else {
            subtreeNode = HomeServer.getInstance()
        }

        // Loop through the current level
        queue.forEach(childNodeName => {
            tempServerMap = [
                ...tempServerMap,
                ...this.spider(ns, childNodeName, subtreeNode)
            ]
        });

        let children: Server[] = tempServerMap.filter(node => queue.includes(node.host))

        // Create the subtree node
        let treeStructure: TreeStructure;
        if (parent) {
            treeStructure = {
                connections: [...children, parent],
                children: children,
                parent: parent
            }
        } else {
            treeStructure = {
                connections: children,
                children: children
            }
        }

        subtreeNode.updateTree(treeStructure)

        return [
            ...tempServerMap,
            subtreeNode
        ];
    }

    public printServerMap(ns: NS) {
        this.printServer(ns, HomeServer.getInstance(), 0)
    }

    private printServer(ns: NS, server: Server, level: number) {
        const text: string = "\t".repeat(level) + server.host;
        ns.tprint(text)
        if (server && server.treeStructure && server.treeStructure.children)
            server.treeStructure.children.forEach(child => this.printServer(ns, child, level + 1))
    }
}