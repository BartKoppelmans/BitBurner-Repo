import * as LogAPI from '/src/api/LogAPI.js';
import { LogType } from '/src/api/LogAPI.js';
import * as ServerAPI from '/src/api/ServerAPI.js';
import { Program, ProgramType } from '/src/classes/Misc/Program.js';
import { CONSTANT } from '/src/lib/constants.js';
import * as ServerUtils from '/src/util/ServerUtils.js';
import * as Utils from '/src/util/Utils.js';
import * as PlayerUtils from '/src/util/PlayerUtils.js';
class ProgramRunner {
    static hasAllPrograms(ns) {
        return ProgramRunner.getRemainingPrograms(ns).length === 0;
    }
    static getPrograms(ns) {
        return [
            new Program(ns, 'BruteSSH.exe', 500000, ProgramType.Crack),
            new Program(ns, 'FTPCrack.exe', 1500000, ProgramType.Crack),
            new Program(ns, 'relaySMTP.exe', 5000000, ProgramType.Crack),
            new Program(ns, 'HTTPWorm.exe', 30000000, ProgramType.Crack),
            new Program(ns, 'SQLInject.exe', 250000000, ProgramType.Crack),
            new Program(ns, 'Autolink.exe', 1000000, ProgramType.Util),
        ];
    }
    static getRemainingPrograms(ns) {
        return ProgramRunner.getPrograms(ns).filter((program) => !program.hasProgram(ns));
    }
    static hasTor(ns) {
        return ns.getPlayer().tor;
    }
    static getNumCrackScripts(ns) {
        return ProgramRunner.getPrograms(ns)
            .filter(program => program.type === ProgramType.Crack && program.hasProgram(ns)).length;
    }
    static canRoot(ns, server) {
        if (!ServerUtils.isHackableServer(server)) {
            return false;
        }
        const hackableServer = server;
        return ProgramRunner.getNumCrackScripts(ns) >= hackableServer.staticHackingProperties.ports;
    }
    async run(ns) {
        LogAPI.debug(ns, `Running the ProgramRunner`);
        const money = PlayerUtils.getMoney(ns);
        if (!ProgramRunner.hasTor(ns)) {
            if (money < CONSTANT.TOR_ROUTER_COST)
                return;
            else {
                ns.purchaseTor();
                LogAPI.log(ns, `Purchased TOR Router`, LogType.INFORMATION);
            }
        }
        const remainingPrograms = ProgramRunner.getRemainingPrograms(ns);
        let hasUpdated = false;
        for (const program of remainingPrograms) {
            const isSuccessful = await program.attemptPurchase(ns);
            hasUpdated = hasUpdated || isSuccessful;
        }
        if (hasUpdated)
            await this.rootAllServers(ns);
    }
    async root(ns, server) {
        if (server.isRooted(ns)) {
            throw new Error('Server is already rooted.');
        }
        // This also serves as a type check
        if (!ProgramRunner.canRoot(ns, server)) {
            throw new Error('Cannot crack the server.');
        }
        const hackableServer = server;
        const crackingScripts = this.getCrackingScripts(ns, hackableServer.staticHackingProperties.ports);
        crackingScripts.forEach(program => program.run(ns, server));
        ns.nuke(server.characteristics.host);
    }
    async rootAllServers(ns) {
        const serverMap = await ServerAPI.getServerMap(ns);
        // Root all servers
        await Promise.allSettled(serverMap.servers.map(async (server) => {
            if (!server.isRooted(ns) && ProgramRunner.canRoot(ns, server)) {
                return this.root(ns, server);
            }
        }));
    }
    ;
    // Returns a sorted list of cracking scripts that can be used to root
    getCrackingScripts(ns, ports) {
        if (ports > ProgramRunner.getNumCrackScripts(ns)) {
            throw new Error('Not enough cracking scripts available.');
        }
        return ProgramRunner.getPrograms(ns)
            .filter(program => program.type === ProgramType.Crack && program.hasProgram(ns))
            .sort((a, b) => a.price - b.price)
            .slice(0, ports);
    }
}
export async function main(ns) {
    Utils.disableLogging(ns);
    await (new ProgramRunner()).run(ns);
}
