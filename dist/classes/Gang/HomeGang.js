import Gang from '/src/classes/Gang/Gang.js';
export default class HomeGang extends Gang {
    constructor(ns, name) {
        super(ns, name);
    }
    static getHomeGang(ns) {
        const name = ns.gang.getGangInformation().faction;
        return new HomeGang(ns, name);
    }
    getGangInformation(ns) {
        return ns.gang.getGangInformation();
    }
}
