export async function main(ns) {
    ns.tprint("Killing all scripts.")

    let hostname = ns.getHostname()
    if (hostname !== 'home') {
        throw new Error('Run the script from home')
    }

    // TODO: Kill all servers

    ns.tprint(`All processes killed`)
}