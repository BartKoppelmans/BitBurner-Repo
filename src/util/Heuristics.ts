import type { NS }    from 'Bitburner'
import HackableServer from '/src/classes/Server/HackableServer.js'


// TODO: These do not seem to work properly?

export type HeuristicValue = number;

export type ServerHeuristic = (ns: NS, server: HackableServer) => HeuristicValue;

export let MainHeuristic: ServerHeuristic = (ns: NS, target: HackableServer): HeuristicValue => {
	return target.staticHackingProperties.maxMoney * (100 / (target.staticHackingProperties.minSecurityLevel + target.getSecurityLevel(ns)))
}

export let DiscordHeuristic: ServerHeuristic = (ns: NS, target: HackableServer): HeuristicValue => {
	return target.staticHackingProperties.maxMoney * target.staticHackingProperties.growth / target.staticHackingProperties.minSecurityLevel / (target.staticHackingProperties.hackingLevel + 50)
}