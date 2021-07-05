export default class Crime {
    constructor(ns, name) {
        this.name = name;
        this.crimeStats = ns.getCrimeStats(this.name);
        this.updateCrimeChance(ns);
    }
    commit(ns) {
        ns.commitCrime(this.name);
    }
    updateCrimeChance(ns) {
        this.crimeChance = ns.getCrimeChance(this.name);
    }
    async evaluate(ns) {
        this.updateCrimeChance(ns);
        return this.crimeValue = this.crimeChance *
            (this.crimeStats.money / this.crimeStats.time) *
            ((this.crimeStats.intelligence_exp * 0.1 + 1) / (this.crimeStats.intelligence_exp * 0.1 + 2));
    }
}
