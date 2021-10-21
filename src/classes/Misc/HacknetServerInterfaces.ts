import { HacknetServer } from '/src/classes/Server/HacknetServer'

export enum HacknetServerUpgradeType {
	LEVEL,
	RAM,
	CORES,
	CACHE,
	NEW
}

export type HacknetServerHashUpgradeType =
	HacknetServerUpgradeType.RAM
	| HacknetServerUpgradeType.CORES
	| HacknetServerUpgradeType.LEVEL

export type HacknetServerUpgrade = HacknetServerHashUpgrade | HacknetServerCacheUpgrade | HacknetServerAddition;

export interface HacknetServerHashUpgrade {
	server: HacknetServer,
	type: HacknetServerHashUpgradeType,
	hashDelta: number,
	levels: number
	cost: number
}

export interface HacknetServerCacheUpgrade {
	server: HacknetServer,
	type: HacknetServerUpgradeType.CACHE,
	cacheDelta: number,
	levels: number,
	cost: number
}

export interface HacknetServerAddition {
	type: HacknetServerUpgradeType.NEW,
	cost: number,
	hashDelta: number,
}