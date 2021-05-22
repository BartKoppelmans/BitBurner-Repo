export async function main(ns, target, threads) {
    await ns.grow(target.host, { threads: threads });
}
