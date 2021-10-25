import { createBox } from '/src/UI/API/box.js';
import * as ServerAPI from '/src/api/ServerAPI.js';
import { DOMcreateElement } from '/src/UI/API/index.js';
import { styles } from '/src/UI/hackingUIstyles.js';
import { ServerStatus } from '/src/classes/Server/ServerInterfaces.js';
let box;
function getBoxHTML() {
    return DOMcreateElement("div", { className: 'resizable', style: "height: 520px; width: 720px; overflow:auto;" },
        styles,
        DOMcreateElement("table", { style: 'width: 100%;' },
            DOMcreateElement("tr", null,
                DOMcreateElement("th", null, "Server"),
                DOMcreateElement("th", null, "Money"),
                DOMcreateElement("th", null, "Security")),
            DOMcreateElement("tbody", { id: "boxContent" })));
}
async function initialize(ns) {
    box = createBox('Hacking analysis tool', getBoxHTML());
    const closeButton = box.querySelector(".boxclose");
    if (closeButton)
        closeButton.addEventListener('click', () => ns.exit());
}
function setContent(ns, elements) {
    const contentElement = box.querySelector('#boxContent');
    if (!contentElement)
        return;
    // TODO: Remove this flag
    // @ts-ignore
    contentElement.replaceChildren(...elements);
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
function createServerEntry(ns, server) {
    return DOMcreateElement("tr", { className: `serverEntry ${getServerStatusClass(server.status)}` },
        DOMcreateElement("td", null, server.characteristics.host),
        DOMcreateElement("td", null,
            ns.nFormat(server.getMoney(ns), '$0.000a'),
            " / ",
            ns.nFormat(server.staticHackingProperties.maxMoney, '$0.000a')),
        DOMcreateElement("td", null,
            ns.nFormat(server.getSecurityLevel(ns), '0.000'),
            " / ",
            ns.nFormat(server.staticHackingProperties.minSecurityLevel, '0.000')));
}
async function updateBox(ns) {
    const servers = ServerAPI.getHackableServers(ns);
    const content = [];
    for (const server of servers) {
        const serverEntry = createServerEntry(ns, server);
        content.push(serverEntry);
    }
    setContent(ns, content);
}
export async function main(ns) {
    await initialize(ns);
    while (true) {
        await updateBox(ns);
        await ns.sleep(100);
    }
}
