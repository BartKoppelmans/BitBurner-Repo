import type { BitBurner as NS } from 'Bitburner'
import HackableServer           from '/src/classes/Server/HackableServer.js'

export namespace Heuristics {

	// TODO: These do not seem to work properly?

	export type HeuristicValue = number;

	export interface ServerHeuristic {
		(ns: NS, server: HackableServer): HeuristicValue;
	}

	export var MainHeuristic: ServerHeuristic = function (ns: NS, target: HackableServer): HeuristicValue {
		return target.staticHackingProperties.maxMoney * (100 / (target.staticHackingProperties.minSecurityLevel + target.getSecurityLevel(ns)))
	}

	export var DiscordHeuristic: ServerHeuristic = function (ns: NS, target: HackableServer): HeuristicValue {
		return target.staticHackingProperties.maxMoney * target.staticHackingProperties.growth / target.staticHackingProperties.minSecurityLevel / (target.staticHackingProperties.hackingLevel + 50)
	}
}