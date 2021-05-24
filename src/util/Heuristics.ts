

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
        if (!server.securityLevel) {
            throw new Error(`Unable to evaluate ${server.host}`);
        }

        // TODO: Get rid of magic numbers

        return server.maxMoney * (100 / (server.minSecurityLevel + server.securityLevel));
    }
}

