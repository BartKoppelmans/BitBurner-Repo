import type { BitBurner as NS } from "Bitburner";
import HackableServer from "/src/classes/HackableServer.js";

export namespace Heuristics {

    export type HeuristicValue = number;

    export interface Heuristic {
        (ns: NS, server: HackableServer): HeuristicValue;
    }

    export var MainHeuristic: Heuristic = function (ns: NS, server: HackableServer): HeuristicValue {
        return 0;
    };

    export function evaluate(ns: NS, server: HackableServer): HeuristicValue {
        if (!server.dynamicHackingProperties.securityLevel) {
            throw new Error(`Unable to evaluate ${server.host}`);
        }

        // TODO: Get rid of magic numbers

        return server.staticHackingProperties.maxMoney * (100 / (server.staticHackingProperties.minSecurityLevel + server.dynamicHackingProperties.securityLevel));
    }
}

