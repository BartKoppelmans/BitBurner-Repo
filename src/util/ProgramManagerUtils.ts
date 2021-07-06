import type { BitBurner as NS } from "Bitburner";

export function hasTor(ns: NS): boolean {
    return ns.getPlayer().tor;
}
