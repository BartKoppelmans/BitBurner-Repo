import type { BitBurner as NS } from "Bitburner";
import HackableServer from "/src/classes/HackableServer.js";
import { Program } from "/src/classes/Program.js";
import Server from "/src/classes/Server.js";
import { CONSTANT } from "/src/lib/constants.js";
import ProgramManager from '/src/managers/ProgramManager.js';

export function isHomeServer(server: Server): boolean {
    return isHome(server.host);
}

export function isHome(host: string): boolean {
    return (host === CONSTANT.HOME_SERVER_HOST);
}

export function isDarkwebServer(server: Server) {
    return isDarkweb(server.host);
}

export function isDarkweb(host: string): boolean {
    return (host === CONSTANT.DARKWEB_HOST);
}

export function isPurchasedServer(server: Server): boolean {
    return isPurchased(server.host);
}

export function isPurchased(host: string): boolean {
    return host.includes(CONSTANT.PURCHASED_SERVER_PREFIX);
}

export function isHackableServer(server: Server): boolean {
    return (server.constructor.name === "HackableServer");
}

export function isRooted(ns: NS, server: Server): boolean {
    return ns.hasRootAccess(server.host);
}

export function canRoot(ns: NS, server: Server) {
    if (!isHackableServer(server)) {
        return false;
    }
    const hackableServer: HackableServer = server as HackableServer;
    return ProgramManager.getInstance(ns).getNumCrackScripts(ns) >= hackableServer.staticHackingProperties.ports;
}

export async function root(ns: NS, server: Server): Promise<void> {
    if (isRooted(ns, server)) {
        throw new Error("Server is already rooted.");
    }

    // This also serves as a type check
    if (!canRoot(ns, server)) {
        throw new Error("Cannot crack the server.");
    }

    const hackableServer: HackableServer = server as HackableServer;

    const crackingScripts: Program[] = ProgramManager.getInstance(ns).getCrackingScripts(ns, hackableServer.staticHackingProperties.ports);

    crackingScripts.forEach(program => program.run(ns, server));

    ns.nuke(server.host);
}