import GangMember from '/src/classes/Gang/GangMember.js'
import GangTask   from '/src/classes/Gang/GangTask.js'

export type GangTaskName = string

export interface GangMemberStats {
	hack: number,
	str: number,
	def: number,
	dex: number,
	agi: number,
	cha: number,
}

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

export type GangUpgradeName = string
export type GangUpgradeType = string

export type GangMemberEvaluation = { member: GangMember, score: number }

export interface GangUpgradeMultipliers {
	hack?: number;
	str?: number;
	def?: number;
	dex?: number;
	agi?: number;
	cha?: number;
}

export type GangTaskGain = { task: GangTask, gain: number }