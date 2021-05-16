


export async function buildServerList(ns) {
    const starting_node = ns.getHostname()

    let nodes = [starting_node];

    while (nodes.length > 0) {
        let host = nodes.pop();
        if (!addedServers.includes(hostName)) {
            var connectedHosts = ns.scan(hostName);
            for (var i = 0; i < connectedHosts.length; i++) {
                hostsToScan.push(connectedHosts[i]);
            }
            addServer(buildServerObject(ns, hostName));
        }
        await ns.sleep(10);
    }

    sortServerList("ram");
    sortServerList("money");
}