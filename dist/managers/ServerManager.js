import Server from '/src/classes/Server.js';
import HackableServer from '/src/classes/HackableServer.js';
import PurchasedServer from '/src/classes/PurchasedServer.js';
import HomeServer from "/src/classes/HomeServer.js";
import { CONSTANT } from "/src/lib/constants.js";
import * as ServerUtils from "/src/util/ServerUtils.js";
// TODO: Move this to a seperate script that is always running,
// Let it communicate the server lists via ports
export default class ServerManager {
    constructor() {
        this.serverMap = [];
        this.lastUpdated = CONSTANT.EPOCH_DATE;
    }
    static getInstance(ns) {
        if (!ServerManager.instance) {
            ServerManager.instance = new ServerManager();
        }
        return ServerManager.instance;
    }
    buildServerMap(ns) {
        const hostName = ns.getHostname();
        if (hostName !== 'home') {
            throw new Error('Run the script from home');
        }
        let serverMap = this.spider(ns, hostName);
        this.lastUpdated = new Date();
        return serverMap;
    }
    rebuildServerMap(ns) {
        this.serverMap = this.buildServerMap(ns);
    }
    getServerMap(ns, forceUpdate = false) {
        if (this.needsUpdate(ns) || forceUpdate) {
            this.rebuildServerMap(ns);
        }
        return this.serverMap;
    }
    needsUpdate(ns) {
        return (Date.now() - this.lastUpdated.getTime()) > CONSTANT.SERVER_MAP_REBUILD_TIME;
    }
    spider(ns, nodeName, parent) {
        let tempServerMap = [];
        let queue = ns.scan(nodeName);
        if (parent) {
            const parentIndex = queue.indexOf(parent.host);
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
        let subtreeNode;
        if (parent) {
            subtreeNode = new HackableServer(ns, nodeName, { parent: parent });
        }
        else {
            subtreeNode = HomeServer.getInstance(ns);
        }
        // Loop through the current level
        queue.forEach(childNodeName => {
            tempServerMap = [
                ...tempServerMap,
                ...this.spider(ns, childNodeName, subtreeNode)
            ];
        });
        let children = tempServerMap.filter(node => queue.includes(node.host));
        // Create the subtree structure
        let treeStructure;
        if (parent) {
            treeStructure = {
                connections: [...children, parent],
                children: children,
                parent: parent
            };
        }
        else {
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
    async getTargetableServers(ns) {
        let servers = (await this.getServerMap(ns))
            .filter(server => ServerUtils.isHackableServer(server));
        servers = servers
            .filter(server => server.isHackable(ns))
            .filter(server => ServerUtils.isRooted(ns, server) || ServerUtils.canRoot(ns, server))
            .filter(server => server.staticHackingProperties.maxMoney > 0);
        return servers;
    }
    // We sort this descending
    async getHackingServers(ns) {
        return (await this.getServerMap(ns))
            .filter((server) => ServerUtils.isRooted(ns, server))
            .sort((a, b) => b.getAvailableRam(ns) - a.getAvailableRam(ns));
    }
    // We sort this ascending
    async getPurchasedServers(ns) {
        return (await this.getServerMap(ns))
            .filter((server) => ServerUtils.isPurchasedServer(server))
            .sort((a, b) => a.getAvailableRam(ns) - b.getAvailableRam(ns));
    }
    async printServerMap(ns) {
        if (this.needsUpdate(ns)) {
            await this.rebuildServerMap(ns);
        }
        this.printServer(ns, HomeServer.getInstance(ns), 0);
    }
    printServer(ns, server, level) {
        const text = "  ".repeat(level) + server.host;
        ns.tprint(text);
        if (server && server.treeStructure && server.treeStructure.children)
            server.treeStructure.children.forEach(child => this.printServer(ns, child, level + 1));
        else
            ns.tprint(" ");
    }
}
