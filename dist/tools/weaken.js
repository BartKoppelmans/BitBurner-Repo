export async function main(ns) {
    const target = ns.args[0];
    const start = parseInt(ns.args[1]);
    const wait = start - Date.now();
    await ns.sleep(wait);
    await ns.weaken(target);
}
