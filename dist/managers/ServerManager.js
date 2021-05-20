import Server from '/src/classes/Server.js';
import HackableServer from '/src/classes/HackableServer.js';
import PurchasedServer from '/src/classes/PurchasedServer.js';
import HomeServer from "/src/classes/HomeServer.js";
export class ServerManager {
    constructor(ns) {
        this.serverMap = this.buildServerMap(ns);
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
    spider(ns, nodeName, parent) {
        let tempServerMap = [];
        let queue = ns.scan(nodeName);
        if (parent) {
            const parentIndex = queue.indexOf(parent.host);
            queue.splice(parentIndex);
            // The current node is a leaf
            if (queue.length == 0) {
                // If the node is a purchased server
                if (parent?.isHome() && Server.isPurchasedServer(nodeName)) {
                    return [new PurchasedServer(ns, nodeName)];
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
            subtreeNode = HomeServer.getInstance();
        }
        // Loop through the current level
        queue.forEach(childNodeName => {
            tempServerMap = [
                ...tempServerMap,
                ...this.spider(ns, childNodeName, subtreeNode)
            ];
        });
        let children = tempServerMap.filter(node => queue.includes(node.host));
        // Create the subtree node
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
    printServerMap(ns) {
        this.printServer(ns, HomeServer.getInstance(), 0);
    }
    printServer(ns, server, level) {
        const text = "\t".repeat(level) + server.host;
        ns.tprint(text);
        server.treeStructure?.children?.forEach(child => this.printServer(ns, child, level + 1));
    }
}
