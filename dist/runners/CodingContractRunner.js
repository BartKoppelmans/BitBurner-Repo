import * as LogAPI from '/src/api/LogAPI.js';
import * as ServerAPI from '/src/api/ServerAPI.js';
import { CodingContract } from '/src/classes/Misc/CodingContract.js';
import * as CodingContractUtils from '/src/util/CodingContractUtils.js';
import * as Utils from '/src/util/Utils.js';
class CodingContractRunner {
    static solveContract(ns, contract) {
        const solution = CodingContractUtils.findSolution(ns, contract);
        if (solution === undefined || solution === null) {
            LogAPI.printTerminal(ns, `We currently cannot solve contract ${contract.server.characteristics.host}/${contract.filename}: ${contract.type}`);
            return;
        }
        const isSuccessful = contract.attempt(ns, solution);
        if (isSuccessful)
            CodingContractRunner.onSolvedContract(ns, contract);
        else
            CodingContractRunner.onFailedContract(ns, contract);
    }
    static onFailedContract(ns, contract) {
        LogAPI.printTerminal(ns, `Wrong solution for contract ${contract.server.characteristics.host}/${contract.filename}`);
    }
    static onSolvedContract(ns, contract) {
        LogAPI.printTerminal(ns, `Solved contract ${contract.server.characteristics.host}/${contract.filename}`);
    }
    async run(ns) {
        const serverMap = ServerAPI.getServerMap(ns);
        for (const server of serverMap.servers) {
            const serverContracts = ns.ls(server.characteristics.host, '.cct');
            if (serverContracts.length === 0)
                continue;
            for (const serverContract of serverContracts) {
                const contract = new CodingContract(ns, serverContract, server);
                CodingContractRunner.solveContract(ns, contract);
            }
        }
    }
}
export async function main(ns) {
    Utils.disableLogging(ns);
    await (new CodingContractRunner()).run(ns);
}
