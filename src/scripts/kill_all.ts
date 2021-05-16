export async function main(ns) {
    ns.tprint("Killing all scripts.")

    let hostname = ns.getHostname()
    if (hostname !== 'home') {
        throw new Exception('Run the script from home')
    }

    const killAbleServers = Object.keys(serverMap.servers)
        .filter((hostname) => ns.serverExists(hostname))
        .filter((hostname) => hostname !== 'home')

    for (let i = 0; i < killAbleServers.length; i++) {
        await ns.killall(killAbleServers[i])
    }

    ns.tprint(`All processes killed`)
}