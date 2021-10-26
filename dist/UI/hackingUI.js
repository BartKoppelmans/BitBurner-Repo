import { createBox } from '/src/UI/API/box.js';
import * as ServerAPI from '/src/api/ServerAPI.js';
import { Colors } from '/src/UI/styles/hackingUIstyles.js';
import { ServerStatus } from '/src/classes/Server/ServerInterfaces.js';
import { initializeStates, MainBox, ServerEntry } from '/src/UI/elements/hackingUIelements.js';
let box;
const sortOrder = [ServerStatus.TARGETING, ServerStatus.PREPPING, ServerStatus.NONE];
async function initialize(ns) {
    box = createBox('Hacking analysis tool', MainBox());
    initializeStates(ns);
    const closeButton = box.querySelector(".boxclose");
    if (closeButton)
        closeButton.addEventListener('click', () => ns.exit());
    for (const key in Colors) {
        if (Colors.hasOwnProperty(key)) {
            const value = Colors[key];
            box.style.setProperty(`--${key}`, value);
        }
    }
}
function setContent(ns, elements) {
    const contentElement = box.querySelector('#boxContent');
    if (!contentElement)
        return;
    // TODO: Remove this flag
    // @ts-ignore
    contentElement.replaceChildren(...elements);
}
async function updateBox(ns) {
    const servers = ServerAPI.getHackableServers(ns);
    servers.sort((a, b) => sortOrder.indexOf(a.status) - sortOrder.indexOf(b.status));
    const content = [];
    for (const server of servers) {
        const serverEntry = ServerEntry(ns, server);
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
