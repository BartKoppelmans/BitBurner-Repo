import * as ServerAPI from "/src/api/ServerAPI.js";
import * as ServerUtils from "/src/util/ServerUtils.js";
import { CONSTANT } from '/src/lib/constants.js';
var PrintColor;
(function (PrintColor) {
    PrintColor["PLAYER"] = "White";
    PrintColor["ROOTED_FACTION"] = "DeepPink";
    PrintColor["NOT_ROOTED_FACTION"] = "Purple";
    PrintColor["ROOTED"] = "Lime";
    PrintColor["NOT_ROOTED"] = "Green";
    PrintColor["ROOTED_PIP"] = "Lime";
    PrintColor["NOT_ROOTED_PIP"] = "Red";
    PrintColor["PIPING"] = "White";
})(PrintColor || (PrintColor = {}));
const showRootedPip = false;
const showCodingContract = true;
function getServerColor(ns, server) {
    const factionServers = ["CSEC", "avmnite-02h", "I.I.I.I", "run4theh111z", "w0r1d_d43m0n"];
    if (ServerUtils.isHomeServer(server) || ServerUtils.isPurchasedServer(server))
        return PrintColor.PLAYER;
    if (factionServers.includes(server.characteristics.host))
        return (server.isRooted(ns)) ? PrintColor.ROOTED_FACTION : PrintColor.NOT_ROOTED_FACTION;
    return (server.isRooted(ns)) ? PrintColor.ROOTED : PrintColor.NOT_ROOTED;
}
function getFormattedServerName(ns, server) {
    const serverColor = getServerColor(ns, server);
    const pipColor = (server.isRooted(ns)) ? PrintColor.ROOTED_PIP : PrintColor.NOT_ROOTED_PIP;
    const hasContracts = (server.files.filter((file) => file.includes('.cct'))).length > 0;
    const clickFunction = `
        const terminal = document.getElementById('terminal-input-text-box');
        terminal.value='home; run src/scripts/route.js ${server.characteristics.host}';
        document.body.dispatchEvent(new KeyboardEvent('keydown', {bubbles: true, keyCode: 13}));
    `;
    let serverInformation = `<strong>${server.characteristics.host}</strong>`;
    if (ServerUtils.isHackableServer(server)) {
        const hackableServer = server;
        serverInformation += `<br>` +
            `Rooted: <span style="color:${pipColor}">${hackableServer.isRooted(ns)}</span><br>` +
            `Hack Level Req: ${hackableServer.staticHackingProperties.hackingLevel}<br>` +
            `Money: ${ns.nFormat(hackableServer.getMoney(ns), '$0.000a')} / ${ns.nFormat(hackableServer.staticHackingProperties.maxMoney, '$0.000a')}<br>` +
            `Security: ${hackableServer.getSecurityLevel(ns)} / Min ${hackableServer.staticHackingProperties.minSecurityLevel}<br>` +
            `Growth: ${hackableServer.staticHackingProperties.growth}`;
    }
    return `<span style="color: ${pipColor}; display: ${(showRootedPip) ? "inline" : "none"}">◉</span>` +
        `<span class="tooltip">` +
        `<a class="scan-analyze-link" onClick="${clickFunction}" style="color: ${serverColor}">${server.characteristics.host}` +
        `<span class="tooltiptext" style="text-align: left;">${serverInformation}</span>` +
        `</a>` +
        `</span>` +
        `<span style="color: ${pipColor}; display: ${(showCodingContract && hasContracts) ? "inline" : "none"}">⋐</span>`;
}
function tprint(html) {
    const doc = eval("document");
    const terminalInput = doc.getElementById("terminal-input");
    const rowElement = doc.createElement("tr");
    const cellElement = doc.createElement("td");
    if (!terminalInput)
        return;
    rowElement.classList.add("posted");
    cellElement.classList.add("terminal-line");
    cellElement.innerHTML = html;
    rowElement.appendChild(cellElement);
    terminalInput.before(rowElement);
    terminalInput.scrollIntoView(false);
}
async function printChildren(ns, server, level, isLastChild) {
    let prefixes = "│ ".repeat(Math.max(level - 1, 0));
    if (!ServerUtils.isHomeServer(server)) {
        prefixes += (isLastChild) ? "└> " : "├> ";
    }
    tprint(`${prefixes}${getFormattedServerName(ns, server)}`);
    if (!server.treeStructure || !server.treeStructure.children)
        throw new Error("We currently do not have the tree structure ready");
    for (const [index, childId] of server.treeStructure.children.entries()) {
        const child = await ServerAPI.getServer(ns, childId);
        await printChildren(ns, child, level + 1, (index === server.treeStructure.children.length - 1));
    }
}
export async function main(ns) {
    const home = await ServerAPI.getServer(ns, CONSTANT.HOME_SERVER_ID);
    await printChildren(ns, home, 0, true);
}
