import type { BitBurner as NS } from "Bitburner";
import Server from '/src/classes/Server.js';
import { DynamicHackingProperties, ServerCharacteristics, ServerPurpose, ServerStatus, StaticHackingProperties, TreeStructure } from "/src/interfaces/ServerInterfaces.js";
import { CONSTANT } from "/src/lib/constants.js";
import { Heuristics } from "/src/util/Heuristics.js";

export default class HackableServer extends Server {

    status: ServerStatus = ServerStatus.NONE;

    staticHackingProperties: StaticHackingProperties;
    dynamicHackingProperties: DynamicHackingProperties;

    serverValue?: Heuristics.HeuristicValue;

    constructor(ns: NS, characteristics: ServerCharacteristics, treeStructure?: TreeStructure, purpose: ServerPurpose = ServerPurpose.NONE) {
        super(ns, characteristics, treeStructure, purpose);

        this.staticHackingProperties = this.getStaticHackingProperties(ns);
        this.dynamicHackingProperties = this.getDynamicHackingProperties(ns);
    }

    private getStaticHackingProperties(ns: NS): StaticHackingProperties {
        return {
            ports: ns.getServerNumPortsRequired(this.characteristics.host),
            hackingLevel: ns.getServerRequiredHackingLevel(this.characteristics.host),
            maxMoney: ns.getServerMaxMoney(this.characteristics.host),
            growth: ns.getServerGrowth(this.characteristics.host),
            minSecurityLevel: ns.getServerMinSecurityLevel(this.characteristics.host),
            baseSecurityLevel: ns.getServerBaseSecurityLevel(this.characteristics.host),
        };
    }

    public updateDynamicHackingProperties(ns: NS, forceUpdate: boolean = false): void {
        if (!forceUpdate) {
            // TODO: Check if we need to update, otherwise return;
        }
        this.dynamicHackingProperties = this.getDynamicHackingProperties(ns);
    }

    private getDynamicHackingProperties(ns: NS): DynamicHackingProperties {

        let percentageToSteal: number = CONSTANT.DEFAULT_PERCENTAGE_TO_STEAL;

        if (this.dynamicHackingProperties && this.dynamicHackingProperties.percentageToSteal) {
            percentageToSteal = this.dynamicHackingProperties.percentageToSteal;
        }

        return {
            lastUpdated: new Date(),
            securityLevel: ns.getServerSecurityLevel(this.characteristics.host),
            money: ns.getServerMoneyAvailable(this.characteristics.host),
            availableRam: this.getAvailableRam(ns),
            weakenTime: ns.getWeakenTime(this.characteristics.host),
            growTime: ns.getGrowTime(this.characteristics.host),
            hackTime: ns.getHackTime(this.characteristics.host),
            percentageToSteal
        };
    }

    // Setter for server Value
    async evaluate(ns: NS, heuristic: Heuristics.Heuristic): Promise<Heuristics.HeuristicValue> {
        this.updateDynamicHackingProperties(ns, true);
        return this.serverValue = heuristic(ns, this);
    }

    public isHackable(ns: NS) {
        return ns.getServerRequiredHackingLevel(this.characteristics.host) <= ns.getHackingLevel();
    }

    public setStatus(status: ServerStatus): void {
        this.status = status;
    }

    public isOptimal(): boolean {
        return this.dynamicHackingProperties.securityLevel === this.staticHackingProperties.minSecurityLevel &&
            this.dynamicHackingProperties.money === this.staticHackingProperties.maxMoney;
    }

    public toJSON() {
        const json: any = super.toJSON();

        return {
            ...json,
            status: this.status
        };

    }
}