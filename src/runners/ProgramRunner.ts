import type { BitBurner as NS } from 'Bitburner'
import * as LogAPI              from '/src/api/LogAPI.js'
import * as ServerAPI           from '/src/api/ServerAPI.js'
import HackableServer           from '/src/classes/Server/HackableServer.js'
import { Program, ProgramType } from '/src/classes/Misc/Program.js'
import Server                   from '/src/classes/Server/Server.js'
import { CONSTANT }             from '/src/lib/constants.js'
import * as ServerUtils         from '/src/util/ServerUtils.js'
import * as Utils               from '/src/util/Utils.js'
import * as PlayerUtils         from '/src/util/PlayerUtils.js'
import { ServerMap }            from '/src/classes/Server/ServerInterfaces.js'
import { Runner }               from '/src/classes/Misc/ScriptInterfaces.js'

class ProgramRunner implements Runner {

	public static hasAllPrograms(ns: NS): boolean {
		return ProgramRunner.getRemainingPrograms(ns).length === 0
	}

	private static getPrograms(ns: NS): Program[] {
		return [
			new Program(ns, 'BruteSSH.exe', 500000, ProgramType.Crack),
			new Program(ns, 'FTPCrack.exe', 1500000, ProgramType.Crack),
			new Program(ns, 'relaySMTP.exe', 5000000, ProgramType.Crack),
			new Program(ns, 'HTTPWorm.exe', 30000000, ProgramType.Crack),
			new Program(ns, 'SQLInject.exe', 250000000, ProgramType.Crack),
			new Program(ns, 'Autolink.exe', 1000000, ProgramType.Util),
		]
	}

	private static getRemainingPrograms(ns: NS): Program[] {
		return ProgramRunner.getPrograms(ns).filter((program) => !program.hasProgram(ns))
	}

	private static hasTor(ns: NS): boolean {
		return ns.getPlayer().tor
	}

	private static getNumCrackScripts(ns: NS): number {
		return ProgramRunner.getPrograms(ns)
		                    .filter(program => program.type === ProgramType.Crack && program.hasProgram(ns)).length
	}

	private static canRoot(ns: NS, server: Server) {
		if (!ServerUtils.isHackableServer(server)) {
			return false
		}
		const hackableServer: HackableServer = server as HackableServer
		return ProgramRunner.getNumCrackScripts(ns) >= hackableServer.staticHackingProperties.ports
	}

	private static isFirstRun(ns: NS): boolean {
		const noodles: Server = ServerAPI.getServerByName(ns, 'n00dles')
		return !noodles.isRooted(ns)
	}

	public async run(ns: NS): Promise<void> {
		const isFirstRun: boolean = ProgramRunner.isFirstRun(ns)

		const money: number = PlayerUtils.getMoney(ns)

		if (!ProgramRunner.hasTor(ns)) {
			if (money < CONSTANT.TOR_ROUTER_COST) {
				if (isFirstRun) this.rootAllServers(ns)
				else return
			} else {
				ns.purchaseTor()
				LogAPI.printTerminal(ns, `Purchased TOR Router`)
			}
		}

		const remainingPrograms: Program[] = ProgramRunner.getRemainingPrograms(ns)

		let hasUpdated = false
		for (const program of remainingPrograms) {
			const isSuccessful: boolean = program.attemptPurchase(ns)
			hasUpdated                  = hasUpdated || isSuccessful
		}

		if (hasUpdated || isFirstRun) this.rootAllServers(ns)

	}

	private root(ns: NS, server: Server): void {
		if (server.isRooted(ns)) {
			throw new Error('Server is already rooted.')
		}

		// This also serves as a type check
		if (!ProgramRunner.canRoot(ns, server)) {
			throw new Error('Cannot crack the server.')
		}

		const hackableServer: HackableServer = server as HackableServer

		const crackingScripts: Program[] = this.getCrackingScripts(ns, hackableServer.staticHackingProperties.ports)

		crackingScripts.forEach(program => program.run(ns, server))

		ns.nuke(server.characteristics.host)
	}

	private rootAllServers(ns: NS): void {
		const serverMap: ServerMap = ServerAPI.getServerMap(ns)

		// Root all servers
		for (const server of serverMap.servers) {
			if (!server.isRooted(ns) && ProgramRunner.canRoot(ns, server)) {
				this.root(ns, server)
			}
		}
	};

	// Returns a sorted list of cracking scripts that can be used to root
	private getCrackingScripts(ns: NS, ports: number): Program[] {
		if (ports > ProgramRunner.getNumCrackScripts(ns)) {
			throw new Error('Not enough cracking scripts available.')
		}

		return ProgramRunner.getPrograms(ns)
		                    .filter(program => program.type === ProgramType.Crack && program.hasProgram(ns))
		                    .sort((a, b) => a.price - b.price)
		                    .slice(0, ports)
	}
}

export async function main(ns: NS) {
	Utils.disableLogging(ns)
	await (new ProgramRunner()).run(ns)
}