import type { BitBurner as NS, Crime as CrimeName, CrimeStats } from 'Bitburner'

const SUCCESS_THRESHOLD: number = 0.6 as const

export default class Crime {

	name: CrimeName
	crimeStats: CrimeStats
	crimeChance!: number
	crimeValue?: number

	public constructor(ns: NS, name: CrimeName) {
		this.name       = name
		this.crimeStats = ns.getCrimeStats(this.name)
		this.updateCrimeChance(ns)
	}

	public commit(ns: NS) {
		ns.commitCrime(this.name)
	}

	public updateCrimeChance(ns: NS) {
		this.crimeChance = ns.getCrimeChance(this.name)
	}

	public evaluate(ns: NS, optimizeForExperience: boolean = false): number {
		this.updateCrimeChance(ns)

		if (this.crimeChance < SUCCESS_THRESHOLD) return 0

		if (!optimizeForExperience) {
			return this.crimeValue = this.crimeChance *
				(this.crimeStats.money / this.crimeStats.time) *
				((this.crimeStats.intelligence_exp * 0.1 + 1) / (this.crimeStats.intelligence_exp * 0.1 + 2))
		} else {

			const summedExperience: number = this.crimeStats.strength_exp + this.crimeStats.defense_exp +
				this.crimeStats.dexterity_exp + this.crimeStats.agility_exp

			const multipliedExperience: number = this.crimeStats.strength_exp * this.crimeStats.defense_exp *
				this.crimeStats.dexterity_exp * this.crimeStats.agility_exp

			return this.crimeValue = this.crimeChance * ((summedExperience * multipliedExperience) + summedExperience)

		}
	}
}