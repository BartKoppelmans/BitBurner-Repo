// the purpose of hack-target is to wait until an appointed time and then execute a hack.
import type { BitBurner as NS } from "Bitburner";

export async function main(ns: NS) {
    await ns.hack(ns.args[0]);
}