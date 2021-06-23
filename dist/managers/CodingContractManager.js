import * as ControlFlowAPI from "/src/api/ControlFlowAPI.js";
import * as ServerAPI from "/src/api/ServerAPI.js";
import { CodingContract } from "/src/classes/CodingContract.js";
import { CONSTANT } from "/src/lib/constants.js";
import * as Utils from "/src/util/Utils.js";
class CodingContractManager {
    constructor() {
        this.contracts = [];
    }
    async initialize(ns) {
        Utils.disableLogging(ns);
    }
    async start(ns) {
        Utils.tprintColored(`Starting the ContractManager`, true, CONSTANT.COLOR_INFORMATION);
        await this.startCheckingLoop(ns);
    }
    async onDestroy(ns) {
        if (this.contractCheckInterval) {
            clearInterval(this.contractCheckInterval);
        }
        Utils.tprintColored(`Stopping the ContractManager`, true, CONSTANT.COLOR_INFORMATION);
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
        Utils.tprintColored(`We found a contract: ${contract.server.characteristics.host}/${contract.filename}`, true, CONSTANT.COLOR_INFORMATION);
    }
    async onSolveContract(ns, contract) {
        // TODO: Remove the contract from the list;
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
