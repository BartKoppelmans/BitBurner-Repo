import type { AugmentationStats, NS } from 'Bitburner'

export class Augmentation {

	name: string
	stats: AugmentationStats
	reputationRequirement: number
	augmentationRequirement: string[]

	public constructor(ns: NS, name: string) {
		this.name                    = name
		this.stats                   = ns.getAugmentationStats(this.name)
		this.reputationRequirement   = ns.getAugmentationRepReq(this.name)
		this.augmentationRequirement = ns.getAugmentationPrereq(this.name)
	}

	// Dynamic value
	public getPrice(ns: NS): number {
		return ns.getAugmentationPrice(this.name)
	}
}