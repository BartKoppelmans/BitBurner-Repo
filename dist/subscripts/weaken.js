export async function main(ns, target, threads) {
    await ns.weaken(target.host, { threads: threads });
}
