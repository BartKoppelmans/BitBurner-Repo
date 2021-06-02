// the purpose of hack-target is to wait until an appointed time and then execute a hack.
import type { BitBurner as NS } from "Bitburner";

export async function main(ns: NS) {

    const target: string = ns.args[0];
    const start: number = parseInt(ns.args[1]);

    const wait: number = start - Date.now();

    await ns.sleep(wait);
    await ns.weaken(target);

}