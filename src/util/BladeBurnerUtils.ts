import { NS }                                          from 'BitBurner'
import BBAction                                        from '/src/classes/BladeBurner/BBAction.js'
import { BBSkill }                                     from '/src/classes/BladeBurner/BBSkill.js'
import { BBActionName, BBActionType, BBSkillPriority } from '/src/classes/BladeBurner/BBInterfaces.js'
import { BBCity }                                      from '/src/classes/BladeBurner/BBCity.js'


export function createCities(ns: NS): BBCity[] {
	const cities: string[] = ['Sector-12', 'New Tokyo', 'Volhaven', 'Aevum', 'Chongqing', 'Ishima']
	return cities.map((city) => new BBCity(ns, city))
}

export function createActions(ns: NS): BBAction[] {
	const actions: BBAction[] = []

	const generalActionNames: string[]   = ns.bladeburner.getGeneralActionNames()
	const contractActionNames: string[]  = ns.bladeburner.getContractNames()
	const operationActionNames: string[] = ns.bladeburner.getOperationNames()
	const blackOpsActionNames: string[]  = ns.bladeburner.getBlackOpNames()

	generalActionNames.forEach((name) => actions.push(new BBAction(ns, name, 'general')))
	contractActionNames.forEach((name) => actions.push(new BBAction(ns, name, 'contracts')))
	operationActionNames.forEach((name) => actions.push(new BBAction(ns, name, 'operations')))
	blackOpsActionNames.forEach((name) => actions.push(new BBAction(ns, name, 'black ops')))

	return actions
}

export function getAction(ns: NS, actions: BBAction[], name: BBActionName): BBAction {
	return actions.find((action) => action.name === name) as BBAction
}

export function getAchievableIntelActions(ns: NS, actions: BBAction[]): BBAction[] {
	const intelActions: BBAction[] = [
		getAction(ns, actions, 'Undercover Operation'),
		getAction(ns, actions, 'Investigation'),
		getAction(ns, actions, 'Tracking'),
	]

	return getAchievableActions(ns, intelActions)
}

export function getAchievableBlackOps(ns: NS, actions: BBAction[]): BBAction[] {
	const achievableBlackOps: BBAction[] | undefined = getAchievableActions(ns, actions, 'black ops')
	return achievableBlackOps.sort((a, b) => {
		return a.getBlackOpRank(ns) - b.getBlackOpRank(ns)
	})
}

export function getAchievableActions(ns: NS, actions: BBAction[], type?: BBActionType): BBAction[] {

	if (type) {
		actions = actions.filter((action) => action.type === type)
	}

	if (type === 'black ops') {
		actions.sort((a, b) => {
			return a.getBlackOpRank(ns) - b.getBlackOpRank(ns)
		})

		const nextAction: BBAction | undefined = actions.find((action) => action.getCount(ns) === 1)

		if (nextAction) actions = [nextAction]
		else return []

	}

	// TODO: Sort by money if it is contracts, or by reputation gain if it is not

	return actions
		.sort((a, b) => {
			return b.getReputationGain(ns) - a.getReputationGain(ns)
		})
		.filter((action) => action.getCount(ns) >= 1)
		.filter((action) => action.isAchievable(ns))
}

export function createSkills(ns: NS): BBSkill[] {
	const skills: BBSkill[]    = []
	const skillNames: string[] = ns.bladeburner.getSkillNames()
	skillNames.forEach((name) => skills.push(new BBSkill(ns, name)))
	return skills
}

export function filterSkills(ns: NS, skills: BBSkill[], priority: BBSkillPriority): BBSkill[] {
	return skills
		.filter((skill) => skill.priority === priority)
		.sort((a, b) => {
			return a.getCost(ns) - b.getCost(ns)
		})
}