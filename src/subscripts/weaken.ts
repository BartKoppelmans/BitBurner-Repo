// the purpose of hack-target is to wait until an appointed time and then execute a hack.
import type { BitBurner as NS } from "Bitburner"
import HackableServer from "/src/classes/HackableServer";

export async function main(ns: NS, target: HackableServer, threads: number) {
    await ns.weaken(target.host, { threads: threads });
}