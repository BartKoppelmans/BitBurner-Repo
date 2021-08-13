import * as LogAPI from '/src/api/LogAPI.js';
import * as ServerAPI from '/src/api/ServerAPI.js';
import { CodingContract } from '/src/classes/CodingContract.js';
import { CONSTANT } from '/src/lib/constants.js';
import * as CodingContractUtils from '/src/util/CodingContractUtils.js';
import * as Utils from '/src/util/Utils.js';
import { LogType } from '/src/interfaces/LogInterfaces.js';
class CodingContractRunner {
    async run(ns) {
        LogAPI.log(ns, `Running the CodingContractRunner`, LogType.INFORMATION);
    }
    async start(ns) {
        await this.startCheckingLoop(ns);
    }
    async onDestroy(ns) {
        if (this.contractCheckInterval) {
            clearInterval(this.contractCheckInterval);
        }
        LogAPI.log(ns, `Stopping the ContractManager`, LogType.INFORMATION);
    }
    async startCheckingLoop(ns) {
        this.contractCheckInterval = setInterval(this.checkingLoop.bind(this, ns), CONSTANT.CONTRACT_CHECK_LOOP_INTERVAL);
        await this.checkingLoop(ns);
    }
    async checkingLoop(ns) {
        const serverMap = await ServerAPI.getServerMap(ns);
        const contracts = [];
        for (const server of serverMap.servers) {
            const serverContracts = server.files.filter((file) => file.includes('.cct'));
            if (serverContracts.length === 0)
                continue;
            for (const contract of serverContracts) {
                contracts.push(new CodingContract(ns, contract, server));
            }
        }
        // Compare the contracts
        for (const contract of contracts) {
            const isNew = !this.contracts.some((c) => c.filename === contract.filename);
            if (isNew)
                this.onNewContract(ns, contract);
        }
        this.contracts = contracts;
    }
    async onNewContract(ns, contract) {
        LogAPI.log(ns, `We found a contract: ${contract.server.characteristics.host}/${contract.filename}`, LogType.CODING_CONTRACT);
        await this.solveContract(ns, contract);
    }
    async solveContract(ns, contract) {
        const solution = CodingContractUtils.findSolution(ns, contract);
        if (solution === undefined || solution === null) {
            LogAPI.log(ns, `We currently cannot solve contract ${contract.server.characteristics.host}/${contract.filename}: ${contract.type}`, LogType.CODING_CONTRACT);
            return;
        }
        const isSuccessful = contract.attempt(ns, solution);
        if (isSuccessful)
            await this.onSolveContract(ns, contract);
        else
            await this.onFailedContract(ns, contract);
    }
    async onFailedContract(ns, contract) {
        LogAPI.log(ns, `Wrong solution for contract ${contract.server.characteristics.host}/${contract.filename}`, LogType.CODING_CONTRACT);
    }
    async onSolveContract(ns, contract) {
        LogAPI.log(ns, `Solved contract ${contract.server.characteristics.host}/${contract.filename}`, LogType.CODING_CONTRACT);
    }
}
export async function main(ns) {
    Utils.disableLogging(ns);
    await (new CodingContractRunner()).run(ns);
}