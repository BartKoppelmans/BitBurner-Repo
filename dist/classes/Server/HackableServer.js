import Server from '/src/classes/Server/Server.js';
import { ServerStatus } from '/src/classes/Server/ServerInterfaces.js';
import { CONSTANT } from '/src/lib/constants.js';
import { Heuristics } from '/src/util/Heuristics.js';
export default class HackableServer extends Server {
    constructor(ns, server) {
        super(ns, server);
        this.status = (server.status) ? server.status : ServerStatus.NONE;
        this.staticHackingProperties = this.getStaticHackingProperties(ns);
        this.percentageToSteal = CONSTANT.DEFAULT_PERCENTAGE_TO_STEAL;
        this.serverValue = Heuristics.DiscordHeuristic(ns, this);
    }
    getSecurityLevel(ns) {
        return ns.getServerSecurityLevel(this.characteristics.host);
    }
    getMoney(ns) {
        return ns.getServerMoneyAvailable(this.characteristics.host);
    }
    getWeakenTime(ns) {
        return ns.getWeakenTime(this.characteristics.host);
    }
    getHackTime(ns) {
        return ns.getHackTime(this.characteristics.host);
    }
    getGrowTime(ns) {
        return ns.getGrowTime(this.characteristics.host);
    }
    isHackable(ns) {
        return ns.getServerRequiredHackingLevel(this.characteristics.host) <= ns.getHackingLevel();
    }
    isOptimal(ns) {
        return this.getSecurityLevel(ns) === this.staticHackingProperties.minSecurityLevel &&
            this.getMoney(ns) === this.staticHackingProperties.maxMoney;
    }
    needsGrow(ns) {
        return this.getMoney(ns) < this.staticHackingProperties.maxMoney;
    }
    needsWeaken(ns) {
        return this.getSecurityLevel(ns) > this.staticHackingProperties.minSecurityLevel;
    }
    toJSON() {
        const json = super.toJSON();
        return {
            ...json,
            status: this.status,
        };
    }
    getStaticHackingProperties(ns) {
        return {
            ports: ns.getServerNumPortsRequired(this.characteristics.host),
            hackingLevel: ns.getServerRequiredHackingLevel(this.characteristics.host),
            maxMoney: ns.getServerMaxMoney(this.characteristics.host),
            growth: ns.getServerGrowth(this.characteristics.host),
            minSecurityLevel: ns.getServerMinSecurityLevel(this.characteristics.host),
            baseSecurityLevel: ns.getServerBaseSecurityLevel(this.characteristics.host),
        };
    }
}
