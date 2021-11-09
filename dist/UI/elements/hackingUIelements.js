import { ServerStatus } from '/src/classes/Server/ServerInterfaces.js';
import * as ServerAPI from '/src/api/ServerAPI.js';
import { DOMcreateElement } from '/src/UI/API/index.js';
import { Styles } from '/src/UI/styles/hackingUIstyles.js';
export const collapsedStates = {};
export function initializeStates(ns) {
    const servers = ServerAPI.getHackableServers(ns);
    for (const server of servers) {
        collapsedStates[server.characteristics.host] = true;
    }
}
function getServerStatusClass(status) {
    switch (status) {
        case ServerStatus.NONE:
            return 'status-none';
        case ServerStatus.PREPPING:
            return 'status-prep';
        case ServerStatus.TARGETING:
            return 'status-hack';
    }
}
export const MainBox = () => {
    return DOMcreateElement("div", { className: "resizable", style: "height: 520px; width: 720px; overflow:auto;" },
        Styles,
        DOMcreateElement("table", { style: "width: 100%;" },
            DOMcreateElement("tbody", { id: "boxContent" })));
};
function getCollapsedState(server) {
    return collapsedStates[server.characteristics.host];
}
function toggleServerEntryDetails(event, server) {
    if (server.status !== ServerStatus.TARGETING)
        return;
    event.stopImmediatePropagation();
    event.preventDefault();
    const serverEntryDetails = event.currentTarget.parentElement?.querySelector(`.serverEntryDetails.server-${server.characteristics.id}`);
    if (!serverEntryDetails)
        return;
    const isCollapsed = serverEntryDetails.classList.contains('collapsed');
    if (isCollapsed) {
        serverEntryDetails.classList.remove('collapsed');
        collapsedStates[server.characteristics.host] = false;
    }
    else {
        serverEntryDetails.classList.add('collapsed');
        collapsedStates[server.characteristics.host] = true;
    }
}
export const ServerEntryDetails = (ns, server) => {
    if (server.status !== ServerStatus.TARGETING)
        return DOMcreateElement("span", null);
    return DOMcreateElement("span", null);
    /*
     TODO: Make sure that this shit works again

     const batch: Batch = JobAPI.getServerBatchJob(ns, server)
     const finishedCycles: number = batch.getNumFinishedCycles()
     const totalCycles: number = batch.getNumCycles()

     return <tr className={`serverEntryDetails ${getCollapsedState(server) ? 'collapsed' : ''} server-${server.characteristics.id}`}>
     <td>{`Cycle ${finishedCycles+1} / ${totalCycles}`}</td>
     </tr>
     */
};
export const ServerEntry = (ns, server) => {
    return (DOMcreateElement("tbody", { className: "serverEntry" },
        DOMcreateElement("tr", { className: `serverEntryOverview ${getServerStatusClass(server.status)} server-${server.characteristics.id}`, onClick: (e) => toggleServerEntryDetails(e, server) },
            DOMcreateElement("td", null, server.characteristics.host),
            DOMcreateElement("td", null,
                ns.nFormat(server.getMoney(ns), '$0.000a'),
                " / ",
                ns.nFormat(server.staticHackingProperties.maxMoney, '$0.000a')),
            DOMcreateElement("td", null,
                ns.nFormat(server.getSecurityLevel(ns), '0.000'),
                " / ",
                ns.nFormat(server.staticHackingProperties.minSecurityLevel, '0.000'))),
        ServerEntryDetails(ns, server)));
};
