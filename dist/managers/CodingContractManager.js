import * as ControlFlowAPI from "/src/api/ControlFlowAPI.js";
import * as LogAPI from "/src/api/LogAPI.js";
import * as ServerAPI from "/src/api/ServerAPI.js";
import { CodingContract } from "/src/classes/CodingContract.js";
import { LogMessageCode } from "/src/interfaces/PortMessageInterfaces.js";
import { CONSTANT } from "/src/lib/constants.js";
import * as CodingContractUtils from "/src/util/CodingContractUtils.js";
import * as Utils from "/src/util/Utils.js";
class CodingContractManager {
    constructor() {
        this.contracts = [];
    }
    async initialize(ns) {
        Utils.disableLogging(ns);
    }
    async start(ns) {
        await LogAPI.log(ns, `Starting the ContractManager`, true, LogMessageCode.INFORMATION);
        await this.startCheckingLoop(ns);
    }
    async onDestroy(ns) {
        if (this.contractCheckInterval) {
            clearInterval(this.contractCheckInterval);
        }
        await LogAPI.log(ns, `Stopping the ContractManager`, true, LogMessageCode.INFORMATION);
    }
    async startCheckingLoop(ns) {
        this.contractCheckInterval = setInterval(this.checkingLoop.bind(this, ns), CONSTANT.CONTRACT_CHECK_LOOP_INTERVAL);
        await this.checkingLoop(ns);
    }
    async checkingLoop(ns) {
        const serverMap = await ServerAPI.getServerMap(ns);
        const contracts = [];
        for (const server of serverMap) {
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
        await LogAPI.log(ns, `We found a contract: ${contract.server.characteristics.host}/${contract.filename}`, true, LogMessageCode.CODING_CONTRACT);
        await this.solveContract(ns, contract);
    }
    async solveContract(ns, contract) {
        let solution = CodingContractUtils.findSolution(ns, contract);
        if (!solution) {
            await LogAPI.log(ns, `We currently cannot solve contract ${contract.server.characteristics.host}/${contract.filename}: ${contract.type}`, true, LogMessageCode.CODING_CONTRACT);
            return;
        }
        const isSuccessful = contract.attempt(ns, solution);
        if (isSuccessful)
            this.onSolveContract(ns, contract);
        else
            this.onFailedContract(ns, contract);
    }
    async onFailedContract(ns, contract) {
        await LogAPI.log(ns, `Wrong solution for contract ${contract.server.characteristics.host}/${contract.filename}`, true, LogMessageCode.CODING_CONTRACT);
    }
    async onSolveContract(ns, contract) {
        await LogAPI.log(ns, `Solved contract ${contract.server.characteristics.host}/${contract.filename}`, true, LogMessageCode.CODING_CONTRACT);
    }
}
export async function main(ns) {
    const instance = new CodingContractManager();
    await instance.initialize(ns);
    await instance.start(ns);
    while (true) {
        const shouldKill = await ControlFlowAPI.hasManagerKillRequest(ns);
        if (shouldKill) {
            await instance.onDestroy(ns);
            ns.exit();
        }
        await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL);
    }
}
