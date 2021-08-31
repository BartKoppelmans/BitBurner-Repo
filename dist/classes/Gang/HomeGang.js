import Gang from '/src/classes/Gang/Gang.js';
import * as LogAPI from '/src/api/LogAPI.js';
import { LogType } from '/src/api/LogAPI.js';
export default class HomeGang extends Gang {
    constructor(ns, name) {
        super(ns, name);
    }
    static getHomeGang(ns) {
        const name = ns.gang.getGangInformation().faction;
        return new HomeGang(ns, name);
    }
    enableTerritoryWarfare(ns) {
        const clashChance = this.getGangInformation(ns).territoryClashChance;
        const isInWarfare = (clashChance === 1);
        if (isInWarfare)
            return;
        ns.gang.setTerritoryWarfare(true);
        LogAPI.log(ns, `Enabling territory warfare`, LogType.GANG);
    }
    disableTerritoryWarfare(ns) {
        const clashChance = this.getGangInformation(ns).territoryClashChance;
        const isInWarfare = (clashChance === 1);
        if (!isInWarfare)
            return;
        ns.gang.setTerritoryWarfare(false);
        LogAPI.log(ns, `Disabling territory warfare`, LogType.GANG);
    }
    getGangInformation(ns) {
        return ns.gang.getGangInformation();
    }
}
