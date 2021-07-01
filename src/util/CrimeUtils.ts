import type { BitBurner as NS, Crime as CrimeName } from "Bitburner";
import Crime from "/src/classes/Crime.js";

export function getCrimes(ns: NS): Crime[] {
    const crimeNames: CrimeName[] = ["shoplift", "rob store", "mug", "larceny", "deal drugs", "bond forgery", "traffick arms", "homicide", "grand theft auto", "kidnap", "assassinate", "heist"];
    return crimeNames.map((crimeName) => new Crime(ns, crimeName));
}