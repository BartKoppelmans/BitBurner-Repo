import Server from '/src/classes/Server/Server.js';
import { CONSTANT } from '/src/lib/constants.js';
export class HacknetServer extends Server {
    constructor(ns, server) {
        super(ns, server);
        if (!server.characteristics)
            throw new Error('Cannot initialize the hacknet server without its characteristics');
        this.characteristics = server.characteristics;
        if (!server.nodeInformation)
            this.nodeInformation = HacknetServer.getNodeInformation(ns, this.characteristics.hacknetServerId);
        else
            this.nodeInformation = server.nodeInformation;
    }
    static getNodeInformation(ns, id) {
        const nodeStats = ns.hacknet.getNodeStats(id);
        return {
            level: nodeStats.level,
            ram: nodeStats.ram,
            cores: nodeStats.cores,
            cache: nodeStats.cache,
            hashCapacity: nodeStats.hashCapacity,
        };
    }
    static getDefaultTreeStructure() {
        return {
            connections: [CONSTANT.HOME_SERVER_ID],
            parent: CONSTANT.HOME_SERVER_ID,
            children: [],
        };
    }
    getGainRate(ns, player) {
        return ns.formulas.hacknetServers.hashGainRate(this.nodeInformation.level, 0, this.nodeInformation.ram, this.nodeInformation.cores, player.hacknet_node_money_mult);
    }
    toJSON() {
        const json = super.toJSON();
        return {
            ...json,
            characteristics: this.characteristics,
        };
    }
}
