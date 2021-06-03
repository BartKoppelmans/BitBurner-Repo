import type { BitBurner as NS } from "Bitburner";
import Server, { TreeStructure } from '/src/classes/Server.js';
import HackableServer from '/src/classes/HackableServer.js';
import PurchasedServer from '/src/classes/PurchasedServer.js';
import HomeServer from "/src/classes/HomeServer.js";
import { CONSTANT } from "/src/lib/constants.js";
import * as ServerUtils from "/src/util/ServerUtils.js";

export default class ServerManager {
    private static instance: ServerManager;


    private serverMap: Server[] = [];
    private lastUpdated: Date = CONSTANT.EPOCH_DATE;

    private constructor() { }

    public static getInstance(ns: NS): ServerManager {
        if (!ServerManager.instance) {
            ServerManager.instance = new ServerManager();
        }

        return ServerManager.instance;
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

    public async rebuildServerMap(ns: NS) {
        this.serverMap = await this.buildServerMap(ns);
    }

    public async getServerMap(ns: NS, forceUpdate: boolean = false) {
        if (this.needsUpdate(ns) || forceUpdate) {
            await this.rebuildServerMap(ns);
        }
        return this.serverMap;
    }

    private needsUpdate(ns: NS): boolean {
        return (Date.now() - this.lastUpdated.getTime()) > CONSTANT.SERVER_MAP_REBUILD_TIME;
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
                if (ServerUtils.isHome(parent.host) && ServerUtils.isPurchased(nodeName)) {
                    // A purchased server
                    return [new PurchasedServer(ns, nodeName)];
                }
                else if (ServerUtils.isHome(parent.host) && ServerUtils.isDarkweb(nodeName)) {
                    // The darkweb server
                    return [new Server(ns, nodeName)];
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
            subtreeNode = HomeServer.getInstance(ns);
        }

        // Loop through the current level
        queue.forEach(childNodeName => {
            tempServerMap = [
                ...tempServerMap,
                ...this.spider(ns, childNodeName, subtreeNode)
            ];
        });

        let children: Server[] = tempServerMap.filter(node => queue.includes(node.host));

        // Create the subtree structure
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

    public async getTargetableServers(ns: NS): Promise<HackableServer[]> {
        let servers: HackableServer[] = (await this.getServerMap(ns))
            .filter(server => ServerUtils.isHackableServer(server)) as HackableServer[];

        servers = servers
            .filter(server => server.isHackable(ns))
            .filter(server => ServerUtils.isRooted(ns, server) || ServerUtils.canRoot(ns, server))
            .filter(server => server.staticHackingProperties.maxMoney > 0);

        return servers;
    }

    // We sort this descending
    public async getHackingServers(ns: NS): Promise<Server[]> {
        return (await this.getServerMap(ns))
            .filter((server: Server) => ServerUtils.isRooted(ns, server))
            .sort((a, b) => b.getAvailableRam(ns) - a.getAvailableRam(ns));
    }

    // We sort this ascending
    public async getPurchasedServers(ns: NS): Promise<PurchasedServer[]> {
        return (await this.getServerMap(ns))
            .filter((server: Server) => ServerUtils.isPurchasedServer(server))
            .sort((a, b) => a.getAvailableRam(ns) - b.getAvailableRam(ns));
    }

    public async printServerMap(ns: NS) {
        if (this.needsUpdate(ns)) {
            await this.rebuildServerMap(ns);
        }

        this.printServer(ns, HomeServer.getInstance(ns), 0);
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