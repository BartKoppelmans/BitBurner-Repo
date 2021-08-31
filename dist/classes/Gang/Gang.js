export default class Gang {
    constructor(ns, name) {
        this.name = name;
    }
    static getGangs(ns) {
        const gangNames = ['Slum Snakes', 'Tetrads', 'The Syndicate', 'The Dark Army', 'Speakers for the Dead', 'NiteSec', 'The Black Hand'];
        return gangNames.map((name) => new Gang(ns, name));
    }
    getGangInformation(ns) {
        const gangInformation = ns.gang.getOtherGangInformation();
        return gangInformation[this.name];
    }
    getPower(ns) {
        return this.getGangInformation(ns).power;
    }
    getTerritory(ns) {
        return this.getGangInformation(ns).territory;
    }
}
