import { GangAugmentations, GangEquipment, GangEquipmentType, GangTasks } from 'Bitburner'

export type GangTaskName = GangTasks

export interface GangAscensionPoints {
	hack: number;
	str: number;
	def: number;
	dex: number;
	agi: number;
	cha: number;
}

export interface GangAscensionMultipliers {
	hack: number;
	str: number;
	def: number;
	dex: number;
	agi: number;
	cha: number;
}

export type GangUpgradeName = GangEquipment | GangAugmentations
export type GangUpgradeType = GangEquipmentType

export interface GangUpgradeMultipliers {
	hack?: number;
	str?: number;
	def?: number;
	dex?: number;
	agi?: number;
	cha?: number;

}