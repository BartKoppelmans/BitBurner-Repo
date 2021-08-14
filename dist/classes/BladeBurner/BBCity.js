import * as LogAPI from '/src/api/LogAPI.js';
import { LogType } from '/src/api/LogAPI.js';
export class BBCity {
    // TODO: Include some prioritization for skills
    constructor(ns, name) {
        this.name = name;
    }
    isCurrent(ns) {
        return ns.bladeburner.getCity() === this.name;
    }
    getPopulation(ns) {
        return ns.bladeburner.getCityEstimatedPopulation(this.name);
    }
    getChaos(ns) {
        return ns.bladeburner.getCityChaos(this.name);
    }
    moveTo(ns) {
        ns.bladeburner.switchCity(this.name);
        LogAPI.log(ns, `Moved to ${this.name}`, LogType.BLADEBURNER);
    }
}
