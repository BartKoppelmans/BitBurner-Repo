import Gang from '/src/classes/Gang/Gang.js';
import * as LogAPI from '/src/api/LogAPI.js';
export default class HomeGang extends Gang {
    constructor(ns, name) {
        super(ns, name);
    }
    static getHomeGang(ns) {
        const name = ns.gang.getGangInformation().faction;
        return new HomeGang(ns, name);
    }
    static calculateWantedPenalty(ns, gangInformation) {
        return (gangInformation.respect) / (gangInformation.respect + gangInformation.wantedLevel);
    }
    calculateWantedPenalty(ns) {
        const gangInformation = this.getGangInformation(ns);
        return (gangInformation.respect) / (gangInformation.respect + gangInformation.wantedLevel);
    }
    enableTerritoryWarfare(ns) {
        const clashChance = this.getGangInformation(ns).territoryClashChance;
        const isInWarfare = (clashChance === 1);
        if (isInWarfare)
            return;
        ns.gang.setTerritoryWarfare(true);
        LogAPI.log(ns, `Enabling territory warfare`);
    }
    disableTerritoryWarfare(ns) {
        const clashChance = this.getGangInformation(ns).territoryClashChance;
        const isInWarfare = (clashChance === 1);
        if (!isInWarfare)
            return;
        ns.gang.setTerritoryWarfare(false);
        LogAPI.log(ns, `Disabling territory warfare`);
    }
    getGangInformation(ns) {
        return ns.gang.getGangInformation();
    }
}
