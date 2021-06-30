import type { BitBurner as NS } from "Bitburner";
import HackableServer from "/src/classes/HackableServer.js";

export namespace Heuristics {

    export type HeuristicValue = number;

    export interface Heuristic {
        (ns: NS, server: HackableServer): HeuristicValue;
    }

    export var MainHeuristic: Heuristic = function (ns: NS, target: HackableServer): HeuristicValue {
        return target.staticHackingProperties.maxMoney * (100 / (target.staticHackingProperties.minSecurityLevel + target.getSecurityLevel(ns)));
    };

    export var DiscordHeuristic: Heuristic = function (ns: NS, target: HackableServer): HeuristicValue {
        return target.staticHackingProperties.maxMoney * target.staticHackingProperties.growth / target.staticHackingProperties.minSecurityLevel / (target.staticHackingProperties.hackingLevel + 50);
    };
}

