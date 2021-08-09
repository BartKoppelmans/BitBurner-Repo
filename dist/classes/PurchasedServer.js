import { ServerPurpose, } from '/src/interfaces/ServerInterfaces.js';
import Server from '/src/classes/Server.js';
import { CONSTANT } from '/src/lib/constants.js';
import * as PlayerUtils from '/src/util/PlayerUtils.js';
export default class PurchasedServer extends Server {
    constructor(ns, characteristics, purpose = PurchasedServer.determinePurpose(characteristics.purchasedServerId), quarantinedInformation = { quarantined: false }) {
        super(ns, characteristics, {
            connections: [CONSTANT.HOME_SERVER_ID],
            children: [],
            parent: CONSTANT.HOME_SERVER_ID,
        }, purpose);
        this.characteristics = characteristics;
        this.quarantinedInformation = quarantinedInformation;
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
        const cost = ram * CONSTANT.PURCHASED_SERVER_COST_PER_RAM;
        const availableMoney = PlayerUtils.getMoney(ns) * CONSTANT.PURCHASED_SERVER_ALLOWANCE_PERCENTAGE;
        if (cost > availableMoney)
            return false;
        const processes = ns.ps(this.characteristics.host);
        if (processes.length !== 0)
            return false;
        return true;
    }
    static determinePurpose(id) {
        return (id < CONSTANT.NUM_PURCHASED_HACKING_SERVERS) ? ServerPurpose.HACK : ServerPurpose.PREP;
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
