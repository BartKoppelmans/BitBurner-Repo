import * as LogAPI from '/src/api/LogAPI.js';
import * as ServerAPI from '/src/api/ServerAPI.js';
import { CodingContract } from '/src/classes/CodingContract.js';
import * as CodingContractUtils from '/src/util/CodingContractUtils.js';
import * as Utils from '/src/util/Utils.js';
import { LogType } from '/src/interfaces/LogInterfaces.js';
class CodingContractRunner {
    async run(ns) {
        LogAPI.log(ns, `Running the CodingContractRunner`, LogType.INFORMATION);
        const serverMap = await ServerAPI.getServerMap(ns);
        for (const server of serverMap.servers) {
            const serverContracts = server.files.filter((file) => file.includes('.cct'));
            if (serverContracts.length === 0)
                continue;
            for (const serverContract of serverContracts) {
                const contract = new CodingContract(ns, serverContract, server);
                CodingContractRunner.solveContract(ns, contract);
            }
        }
    }
    static solveContract(ns, contract) {
        const solution = CodingContractUtils.findSolution(ns, contract);
        if (solution === undefined || solution === null) {
            LogAPI.log(ns, `We currently cannot solve contract ${contract.server.characteristics.host}/${contract.filename}: ${contract.type}`, LogType.CODING_CONTRACT);
            return;
        }
        const isSuccessful = contract.attempt(ns, solution);
        if (isSuccessful)
            CodingContractRunner.onSolvedContract(ns, contract);
        else
            CodingContractRunner.onFailedContract(ns, contract);
    }
    static onFailedContract(ns, contract) {
        LogAPI.log(ns, `Wrong solution for contract ${contract.server.characteristics.host}/${contract.filename}`, LogType.CODING_CONTRACT);
    }
    static onSolvedContract(ns, contract) {
        LogAPI.log(ns, `Solved contract ${contract.server.characteristics.host}/${contract.filename}`, LogType.CODING_CONTRACT);
    }
}
export async function main(ns) {
    Utils.disableLogging(ns);
    await (new CodingContractRunner()).run(ns);
}
