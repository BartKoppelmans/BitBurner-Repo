import type { BitBurner as NS } from "Bitburner";
import * as ControlFlowAPI from "/src/api/ControlFlowAPI.js";
import * as ServerAPI from "/src/api/ServerAPI.js";
import { CodingContract, CodingContractAnswer } from "/src/classes/CodingContract.js";
import Server from "/src/classes/Server.js";
import { CONSTANT } from "/src/lib/constants.js";
import * as Utils from "/src/util/Utils.js";
import * as CodingContractUtils from "/src/util/CodingContractUtils.js";

class CodingContractManager {

    private contractCheckInterval?: ReturnType<typeof setInterval>;
    private contracts: CodingContract[] = [];

    public constructor() { }

    public async initialize(ns: NS): Promise<void> {
        Utils.disableLogging(ns);
    }

    public async start(ns: NS): Promise<void> {
        Utils.tprintColored(`Starting the ContractManager`, true, CONSTANT.COLOR_INFORMATION);

        await this.startCheckingLoop(ns);
    }

    public async onDestroy(ns: NS): Promise<void> {
        if (this.contractCheckInterval) {
            clearInterval(this.contractCheckInterval);
        }
        Utils.tprintColored(`Stopping the ContractManager`, true, CONSTANT.COLOR_INFORMATION);
    }

    private async startCheckingLoop(ns: NS): Promise<void> {
        this.contractCheckInterval = setInterval(this.checkingLoop.bind(this, ns), CONSTANT.CONTRACT_CHECK_LOOP_INTERVAL);
        await this.checkingLoop(ns);
    }

    private async checkingLoop(ns: NS): Promise<void> {
        const serverMap: Server[] = await ServerAPI.getServerMap(ns);
        const contracts: CodingContract[] = [];

        for (const server of serverMap) {
            const serverContracts: string[] = server.files.filter((file) => file.includes('.cct'));

            if (serverContracts.length === 0) continue;

            for (const contract of serverContracts) {
                contracts.push(new CodingContract(ns, contract, server));
            }
        }

        // Compare the contracts
        for (const contract of contracts) {
            const isNew: boolean = !this.contracts.some((c) => c.filename === contract.filename);

            if (isNew) this.onNewContract(ns, contract);
        }

        this.contracts = contracts;
    }

    private async onNewContract(ns: NS, contract: CodingContract) {
        Utils.tprintColored(`We found a contract: ${contract.server.characteristics.host}/${contract.filename}`, true, CONSTANT.COLOR_CODING_CONTRACT_INFORMATION);

        await this.solveContract(ns, contract);
    }

    private async solveContract(ns: NS, contract: CodingContract) {
        let solution: CodingContractAnswer | null = CodingContractUtils.findSolution(ns, contract);

        if (!solution) {
            Utils.tprintColored(`We currently cannot solve contract ${contract.server.characteristics.host}/${contract.filename}: ${contract.type}`, true, CONSTANT.COLOR_CODING_CONTRACT_INFORMATION);
            return;
        }

        const isSuccessful: boolean = contract.attempt(ns, solution);
        if (isSuccessful) this.onSolveContract(ns, contract);
        else this.onFailedContract(ns, contract);

    }

    private async onFailedContract(ns: NS, contract: CodingContract) {
        Utils.tprintColored(`Wrong solution for contract ${contract.server.characteristics.host}/${contract.filename}`, true, CONSTANT.COLOR_CODING_CONTRACT_INFORMATION);
    }

    private async onSolveContract(ns: NS, contract: CodingContract) {
        Utils.tprintColored(`Solved contract ${contract.server.characteristics.host}/${contract.filename}`, true, CONSTANT.COLOR_CODING_CONTRACT_INFORMATION);
    }

}

export async function main(ns: NS) {
    const instance: CodingContractManager = new CodingContractManager();

    await instance.initialize(ns);
    await instance.start(ns);

    while (true) {
        const shouldKill: boolean = await ControlFlowAPI.hasManagerKillRequest(ns);

        if (shouldKill) {
            await instance.onDestroy(ns);
            ns.exit();
        }

        await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL);
    }
}