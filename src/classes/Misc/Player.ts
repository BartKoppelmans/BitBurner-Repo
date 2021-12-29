import type { NS, Player as BitBurnerPlayer } from 'Bitburner'

export class Player {


	public constructor(ns: NS) {
	}

	/*
	 public getAugmentations(ns: NS): Augmentation[] {

	 }

	 public hasAugmentation(ns: NS, augmentation: Augmentation): boolean {

	 }
	 */

	public static getPlayer(ns: NS): BitBurnerPlayer {
		return ns.getPlayer()
	}
}