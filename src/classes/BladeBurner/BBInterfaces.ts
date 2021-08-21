import {
	BladeburnerActTypes,
	BladeburnerBlackOps,
	BladeburnerContracts,
	BladeburnerGenActions,
	BladeburnerOperations,
	BladeburnerSkills,
} from 'Bitburner'

export type BBActionName = BladeburnerContracts | BladeburnerOperations | BladeburnerBlackOps | BladeburnerGenActions
export type BBActionType = BladeburnerActTypes;

export type BBSkillName = BladeburnerSkills

export type BBActionChance = { lower: number, upper: number }

export enum BBSkillPriority {
	LOW,
	MEDIUM,
	HIGH
}