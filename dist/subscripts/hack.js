export async function main(ns, target, threads) {
    await ns.hack(target.host, { threads: threads });
}
