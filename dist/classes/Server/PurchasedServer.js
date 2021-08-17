import { ServerPurpose, } from '/src/classes/Server/ServerInterfaces.js';
import Server from '/src/classes/Server/Server.js';
import { CONSTANT } from '/src/lib/constants.js';
import * as PlayerUtils from '/src/util/PlayerUtils.js';
const PERCENTAGE_HACK_PURPOSE = 0.4;
export default class PurchasedServer extends Server {
    constructor(ns, server) {
        super(ns, server);
        if (!server.characteristics)
            throw new Error('Cannot initialize the purchased server without its characteristics');
        this.characteristics = server.characteristics;
        this.quarantinedInformation = (server.quarantinedInformation) ? server.quarantinedInformation : { quarantined: false };
        this.purpose = (this.isQuarantined()) ? ServerPurpose.NONE : PurchasedServer.determinePurpose(ns, server.characteristics.purchasedServerId);
    }
    static determinePurpose(ns, id) {
        return (id < Math.ceil(PERCENTAGE_HACK_PURPOSE * ns.getPurchasedServerLimit())) ? ServerPurpose.HACK : ServerPurpose.PREP;
    }
    static getDefaultTreeStructure() {
        return {
            connections: [CONSTANT.HOME_SERVER_ID],
            parent: CONSTANT.HOME_SERVER_ID,
            children: [],
        };
    }
    isQuarantined() {
        return this.quarantinedInformation.quarantined;
    }
    // TODO: We might want to move this outside of this class
    canUpgrade(ns, ram) {
        // Do this to make sure that we have the value for ram
        if (!this.quarantinedInformation.quarantined || !this.quarantinedInformation.ram)
            return false;
        // TODO: Since we do not keep track of reserved money, we might just not pass the next check
        // We might want to skip it?
        const cost = ns.getPurchasedServerCost(ram);
        const availableMoney = PlayerUtils.getMoney(ns) * CONSTANT.PURCHASED_SERVER_ALLOWANCE_PERCENTAGE;
        if (cost > availableMoney)
            return false;
        const processes = ns.ps(this.characteristics.host);
        if (processes.length !== 0)
            return false;
        return true;
    }
    toJSON() {
        const json = super.toJSON();
        return {
            ...json,
            characteristics: this.characteristics,
            quarantinedInformation: this.quarantinedInformation,
        };
    }
}
