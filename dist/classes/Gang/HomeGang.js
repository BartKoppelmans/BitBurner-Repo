import Gang from '/src/classes/Gang/Gang.js';
import * as LogAPI from '/src/api/LogAPI.js';
export default class HomeGang extends Gang {
    isInWarfare;
    constructor(ns, name) {
        super(ns, name);
        const clashChance = this.getGangInformation(ns).territoryClashChance;
        this.isInWarfare = (clashChance === 1);
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
        if (this.isInWarfare)
            return;
        ns.gang.setTerritoryWarfare(true);
        this.isInWarfare = true;
        LogAPI.printLog(ns, `Enabling territory warfare`);
    }
    disableTerritoryWarfare(ns) {
        if (!this.isInWarfare)
            return;
        ns.gang.setTerritoryWarfare(false);
        this.isInWarfare = false;
        LogAPI.printLog(ns, `Disabling territory warfare`);
    }
    getGangInformation(ns) {
        return ns.gang.getGangInformation();
    }
}
