import type { BitBurner as NS }                 from 'Bitburner'
import * as LogAPI                              from '/src/api/LogAPI.js'
import * as ServerAPI                           from '/src/api/ServerAPI.js'
import { CodingContract, CodingContractAnswer } from '/src/classes/CodingContract.js'
import * as CodingContractUtils                 from '/src/util/CodingContractUtils.js'
import * as Utils                               from '/src/util/Utils.js'
import { ServerMap }                            from '/src/interfaces/ServerInterfaces.js'
import { LogType }                              from '/src/interfaces/LogInterfaces.js'
import { Runner }                               from '/src/interfaces/ClassInterfaces'

class CodingContractRunner implements Runner {

	public async run(ns: NS): Promise<void> {
		LogAPI.log(ns, `Running the CodingContractRunner`, LogType.INFORMATION)

		const serverMap: ServerMap = await ServerAPI.getServerMap(ns)

		for (const server of serverMap.servers) {
			const serverContracts: string[] = server.files.filter((file) => file.includes('.cct'))

			if (serverContracts.length === 0) continue

			for (const serverContract of serverContracts) {
				const contract = new CodingContract(ns, serverContract, server)
				CodingContractRunner.solveContract(ns, contract)
			}
		}
	}

	private static solveContract(ns: NS, contract: CodingContract) {
		const solution: CodingContractAnswer | null = CodingContractUtils.findSolution(ns, contract)

		if (solution === undefined || solution === null) {
			LogAPI.log(ns, `We currently cannot solve contract ${contract.server.characteristics.host}/${contract.filename}: ${contract.type}`, LogType.CODING_CONTRACT)
			return
		}

		const isSuccessful: boolean = contract.attempt(ns, solution)
		if (isSuccessful) CodingContractRunner.onSolvedContract(ns, contract)
		else CodingContractRunner.onFailedContract(ns, contract)

	}

	private static onFailedContract(ns: NS, contract: CodingContract) {
		LogAPI.log(ns, `Wrong solution for contract ${contract.server.characteristics.host}/${contract.filename}`, LogType.CODING_CONTRACT)
	}

	private static onSolvedContract(ns: NS, contract: CodingContract) {
		LogAPI.log(ns, `Solved contract ${contract.server.characteristics.host}/${contract.filename}`, LogType.CODING_CONTRACT)
	}

}


export async function main(ns: NS) {
	Utils.disableLogging(ns)

	await (new CodingContractRunner()).run(ns)
}