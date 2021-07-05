import type { BitBurner as NS, Crime as CrimeName, CrimeStats } from "Bitburner";

export default class Crime {

    name: CrimeName;
    crimeStats: CrimeStats;
    crimeChance!: number;
    crimeValue?: number;

    public constructor(ns: NS, name: CrimeName) {
        this.name = name;
        this.crimeStats = ns.getCrimeStats(this.name);
        this.updateCrimeChance(ns);
    }

    public commit(ns: NS) {
        ns.commitCrime(this.name);
    }

    public updateCrimeChance(ns: NS) {
        this.crimeChance = ns.getCrimeChance(this.name);
    }

    public async evaluate(ns: NS): Promise<number> {
        this.updateCrimeChance(ns);

        if (this.crimeChance < 0.6) return 0;

        return this.crimeValue = this.crimeChance *
            (this.crimeStats.money / this.crimeStats.time) *
            ((this.crimeStats.intelligence_exp * 0.1 + 1) / (this.crimeStats.intelligence_exp * 0.1 + 2));
    }
}