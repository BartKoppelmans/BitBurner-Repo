/* A simple lightweight script that is deployed
 * to remote and local servers to repeatedly hack
 * a particular server.
 * The smaller this is, the more threads can be deployed.
 * args[0] - server name
 * args[1] - threads to attack with
 */
export async function main(ns, args) {
    await hackServer(ns, ns.args[0], ns.args[1]);
}
async function hackServer(ns, server, opts) {
    ns.disableLog('getServerSecurityLevel');
    let serverSecurityThreshold = Math.round(ns.getServerBaseSecurityLevel(server.host) / 3) + 2;
    let serverMoneyThreshold = ns.getServerMaxMoney(server.host) * 0.95;
    while (true) {
        if (ns.getServerSecurityLevel(server.host) > serverSecurityThreshold) {
            await ns.weaken(server.host, opts);
        }
        else if (ns.getServerMoneyAvailable(server.host) < serverMoneyThreshold) {
            await ns.grow(server.host, opts);
        }
        else {
            await ns.hack(server.host, opts);
        }
    }
}
