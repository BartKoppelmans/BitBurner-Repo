const SUCCESS_THRESHOLD = 0.6;
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
    evaluate(ns) {
        this.updateCrimeChance(ns);
        if (this.crimeChance < SUCCESS_THRESHOLD)
            return 0;
        return this.crimeValue = this.crimeChance *
            (this.crimeStats.money / this.crimeStats.time) *
            ((this.crimeStats.intelligence_exp * 0.1 + 1) / (this.crimeStats.intelligence_exp * 0.1 + 2));
    }
}
