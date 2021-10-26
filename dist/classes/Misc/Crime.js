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
    evaluate(ns, optimizeForExperience = false) {
        this.updateCrimeChance(ns);
        if (this.crimeChance < SUCCESS_THRESHOLD)
            return 0;
        if (!optimizeForExperience) {
            return this.crimeValue = this.crimeChance *
                (this.crimeStats.money / this.crimeStats.time) *
                ((this.crimeStats.intelligence_exp * 0.1 + 1) / (this.crimeStats.intelligence_exp * 0.1 + 2));
        }
        else {
            const summedExperience = this.crimeStats.strength_exp + this.crimeStats.defense_exp +
                this.crimeStats.dexterity_exp + this.crimeStats.agility_exp;
            const multipliedExperience = this.crimeStats.strength_exp * this.crimeStats.defense_exp *
                this.crimeStats.dexterity_exp * this.crimeStats.agility_exp;
            return this.crimeValue = this.crimeChance * ((summedExperience * multipliedExperience) + summedExperience);
        }
    }
}
