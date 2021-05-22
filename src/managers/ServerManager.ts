import type { BitBurner as NS } from "Bitburner";
import Server, { TreeStructure } from '/src/classes/Server.js';
import HackableServer from '/src/classes/HackableServer.js';
import PurchasedServer from '/src/classes/PurchasedServer.js';
import HomeServer from "/src/classes/HomeServer.js";
import { CONSTANT } from "/src/lib/constants.js";
import ExternalServer from "/src/classes/ExternalServer";

export class ServerManager {
    private static instance: ServerManager;


    private serverMap: Server[] = [];
    private lastUpdated: Date = CONSTANT.EPOCH_DATE;

    private constructor() {
    }

    public static getInstance(ns: NS): ServerManager {
        if (!ServerManager.instance) {
            ServerManager.instance = new ServerManager();
        }

        return ServerManager.instance;
    }

    public async getServerMap(ns: NS) {
        if (this.needsUpdate(ns)) {
            await this.rebuildServerMap(ns);
        }
        return this.serverMap;
    }

    private async buildServerMap(ns: NS): Promise<Server[]> {
        const hostName = ns.getHostname();
        if (hostName !== 'home') {
            throw new Error('Run the script from home');
        }

        let serverMap: Server[] = this.spider(ns, hostName);
        this.lastUpdated = new Date();
        return serverMap;
    }

    private async rebuildServerMap(ns: NS) {
        this.serverMap = await this.buildServerMap(ns);
    }

    private needsUpdate(ns: NS): boolean {
        return ((new Date()).getTime() - this.lastUpdated.getTime()) > CONSTANT.SERVER_MAP_REBUILD_TIME;
    }

    private spider(ns: NS, nodeName: string, parent?: Server): Server[] {
        let tempServerMap: Server[] = [];

        let queue: string[] = ns.scan(nodeName);

        if (parent) {
            const parentIndex: number = queue.indexOf(parent.host);
            queue.splice(parentIndex, 1);

            // The current node is a leaf
            if (queue.length === 0) {

                // If the node is a purchased server
                if (parent.isHome() && Server.isPurchasedServer(nodeName)) {
                    return [new PurchasedServer(ns, nodeName)];
                }
                else if (parent.isHome() && Server.isDarkweb(nodeName)) {
                    return [new ExternalServer(ns, nodeName)];
                }
                else {
                    const treeStructure = {
                        connections: [parent],
                        parent: parent,
                        children: []
                    };

                    // Create hackable node
                    return [new HackableServer(ns, nodeName, treeStructure)];
                }

            }
        }

        // The current node is a subtree node
        let subtreeNode: Server;
        if (parent) {
            subtreeNode = new HackableServer(ns, nodeName, { parent: parent });
        } else {
            subtreeNode = HomeServer.getInstance();
        }

        // Loop through the current level
        queue.forEach(childNodeName => {
            tempServerMap = [
                ...tempServerMap,
                ...this.spider(ns, childNodeName, subtreeNode)
            ];
        });

        let children: Server[] = tempServerMap.filter(node => queue.includes(node.host));

        // Create the subtree node
        let treeStructure: TreeStructure;
        if (parent) {
            treeStructure = {
                connections: [...children, parent],
                children: children,
                parent: parent
            };
        } else {
            treeStructure = {
                connections: children,
                children: children
            };
        }

        subtreeNode.updateTree(treeStructure);

        return [
            ...tempServerMap,
            subtreeNode
        ];
    }

    public printServerMap(ns: NS) {
        if (this.needsUpdate(ns)) {
            this.rebuildServerMap(ns);
        }

        this.printServer(ns, HomeServer.getInstance(), 0);
    }

    private printServer(ns: NS, server: Server, level: number) {
        const text: string = "  ".repeat(level) + server.host;
        ns.tprint(text);
        if (server && server.treeStructure && server.treeStructure.children)
            server.treeStructure.children.forEach(child => this.printServer(ns, child, level + 1));
        else
            ns.tprint(" ");
    }
}