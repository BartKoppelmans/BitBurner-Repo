import type { AugmentationStats, AugmentName, BitBurner as NS } from 'Bitburner'

export class Augmentation {

	name: AugmentName
	stats: AugmentationStats
	reputationRequirement: number
	augmentationRequirement: AugmentName[]

	public constructor(ns: NS, name: AugmentName) {
		this.name                    = name
		this.stats                   = ns.getAugmentationStats(this.name)
		this.reputationRequirement   = ns.getAugmentationRepReq(this.name)
		this.augmentationRequirement = ns.getAugmentationPrereq(this.name)
	}

	// Dynamic value
	getPrice(ns: NS): number {
		return ns.getAugmentationPrice(this.name)
	}
}