import Server from '/src/classes/Server.js';
import HackableServer from '/src/classes/HackableServer.js';
import PurchasedServer from '/src/classes/PurchasedServer.js';
import HomeServer from "/src/classes/HomeServer.js";
import { CONSTANT } from "/src/lib/constants.js";
import ServerUtils from "/src/util/ServerUtils.js";
export class ServerManager {
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
    async buildServerMap(ns) {
        const hostName = ns.getHostname();
        if (hostName !== 'home') {
            throw new Error('Run the script from home');
        }
        let serverMap = this.spider(ns, hostName);
        this.lastUpdated = new Date();
        return serverMap;
    }
    async getServerMap(ns, forceUpdate = false) {
        if (this.needsUpdate(ns) || forceUpdate) {
            await this.rebuildServerMap(ns);
        }
        return this.serverMap;
    }
    async rebuildServerMap(ns) {
        this.serverMap = await this.buildServerMap(ns);
    }
    needsUpdate(ns) {
        return ((new Date()).getTime() - this.lastUpdated.getTime()) > CONSTANT.SERVER_MAP_REBUILD_TIME;
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
            // We can remove this line because we do not need to root a server to hack it
            // .filter(server => server.canRoot(ns)) 
            .filter(server => server.staticHackingProperties.maxMoney > 0);
        return servers;
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
