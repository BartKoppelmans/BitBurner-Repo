import type { BitBurner as NS }                 from 'Bitburner'
import * as LogAPI                              from '/src/api/LogAPI.js'
import * as ServerAPI                           from '/src/api/ServerAPI.js'
import { CodingContract, CodingContractAnswer } from '/src/classes/Misc/CodingContract.js'
import * as CodingContractUtils                 from '/src/util/CodingContractUtils.js'
import * as Utils                               from '/src/util/Utils.js'
import { ServerMap }                            from '/src/classes/Server/ServerInterfaces.js'
import { Runner }                               from '/src/classes/Misc/ScriptInterfaces.js'

class CodingContractRunner implements Runner {

	private static solveContract(ns: NS, contract: CodingContract) {
		const solution: CodingContractAnswer | null = CodingContractUtils.findSolution(ns, contract)

		if (solution === undefined || solution === null) {
			LogAPI.printTerminal(ns, `We currently cannot solve contract ${contract.server.characteristics.host}/${contract.filename}: ${contract.type}`)
			return
		}

		const isSuccessful: boolean = contract.attempt(ns, solution)
		if (isSuccessful) CodingContractRunner.onSolvedContract(ns, contract)
		else CodingContractRunner.onFailedContract(ns, contract)

	}

	private static onFailedContract(ns: NS, contract: CodingContract) {
		LogAPI.printTerminal(ns, `Wrong solution for contract ${contract.server.characteristics.host}/${contract.filename}`)
	}

	private static onSolvedContract(ns: NS, contract: CodingContract) {
		LogAPI.printTerminal(ns, `Solved contract ${contract.server.characteristics.host}/${contract.filename}`)
	}

	public async run(ns: NS): Promise<void> {
		const serverMap: ServerMap = ServerAPI.getServerMap(ns)

		for (const server of serverMap.servers) {
			const serverContracts: string[] = ns.ls(server.characteristics.host, '.cct')

			if (serverContracts.length === 0) continue

			for (const serverContract of serverContracts) {
				const contract = new CodingContract(ns, serverContract, server)
				CodingContractRunner.solveContract(ns, contract)
			}
		}
	}

}


export async function main(ns: NS) {
	Utils.disableLogging(ns)

	await (new CodingContractRunner()).run(ns)
}