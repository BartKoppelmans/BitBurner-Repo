export async function main(ns) {
    const flags = ns.flags([
        ['target', ''],
        ['start', Date.now()],
    ]);
    const target = flags.target;
    const start = flags.start;
    const wait = start - Date.now();
    await ns.asleep(wait);
    await ns.grow(target);
}
