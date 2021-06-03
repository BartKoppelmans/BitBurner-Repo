import { CONSTANT } from "/src/lib/constants.js";
import ProgramManager from "/src/managers/ProgramManager.js";
export function isHomeServer(server) {
    return isHome(server.host);
}
export function isHome(host) {
    return (host === CONSTANT.HOME_SERVER_HOST);
}
export function isDarkwebServer(server) {
    return isDarkweb(server.host);
}
export function isDarkweb(host) {
    return (host === CONSTANT.DARKWEB_HOST);
}
export function isPurchasedServer(server) {
    return isPurchased(server.host);
}
export function isPurchased(host) {
    return host.includes(CONSTANT.PURCHASED_SERVER_PREFIX);
}
export function isHackableServer(server) {
    return (server.constructor.name === "HackableServer");
}
export function isRooted(ns, server) {
    return ns.hasRootAccess(server.host);
}
export function canRoot(ns, server) {
    if (!isHackableServer(server)) {
        return false;
    }
    const hackableServer = server;
    return ProgramManager.getInstance(ns).getNumCrackScripts(ns) >= hackableServer.staticHackingProperties.ports;
}
export async function root(ns, server) {
    if (isRooted(ns, server)) {
        throw new Error("Server is already rooted.");
    }
    // This also serves as a type check
    if (!canRoot(ns, server)) {
        throw new Error("Cannot crack the server.");
    }
    const hackableServer = server;
    const crackingScripts = ProgramManager.getInstance(ns).getCrackingScripts(ns, hackableServer.staticHackingProperties.ports);
    crackingScripts.forEach(program => program.run(ns, server));
    ns.nuke(server.host);
}
