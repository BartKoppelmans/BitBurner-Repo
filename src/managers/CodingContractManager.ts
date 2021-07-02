import type { BitBurner as NS } from "Bitburner";
import * as ControlFlowAPI from "/src/api/ControlFlowAPI.js";
import * as LogAPI from "/src/api/LogAPI.js";
import * as ServerAPI from "/src/api/ServerAPI.js";
import { CodingContract, CodingContractAnswer } from "/src/classes/CodingContract.js";
import Server from "/src/classes/Server.js";
import { LogMessageCode } from "/src/interfaces/PortMessageInterfaces.js";
import { CONSTANT } from "/src/lib/constants.js";
import * as CodingContractUtils from "/src/util/CodingContractUtils.js";
import * as Utils from "/src/util/Utils.js";

class CodingContractManager {

    private contractCheckInterval?: ReturnType<typeof setInterval>;
    private contracts: CodingContract[] = [];

    public constructor() { }

    public async initialize(ns: NS): Promise<void> {
        Utils.disableLogging(ns);
    }

    public async start(ns: NS): Promise<void> {
        await LogAPI.log(ns, `Starting the ContractManager`, true, LogMessageCode.INFORMATION);

        await this.startCheckingLoop(ns);
    }

    public async onDestroy(ns: NS): Promise<void> {
        if (this.contractCheckInterval) {
            clearInterval(this.contractCheckInterval);
        }
        await LogAPI.log(ns, `Stopping the ContractManager`, true, LogMessageCode.INFORMATION);
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
        await LogAPI.log(ns, `We found a contract: ${contract.server.characteristics.host}/${contract.filename}`, true, LogMessageCode.CODING_CONTRACT);

        await this.solveContract(ns, contract);
    }

    private async solveContract(ns: NS, contract: CodingContract) {
        let solution: CodingContractAnswer | null = CodingContractUtils.findSolution(ns, contract);

        if (!solution) {
            await LogAPI.log(ns, `We currently cannot solve contract ${contract.server.characteristics.host}/${contract.filename}: ${contract.type}`, true, LogMessageCode.CODING_CONTRACT);
            return;
        }

        const isSuccessful: boolean = contract.attempt(ns, solution);
        if (isSuccessful) this.onSolveContract(ns, contract);
        else this.onFailedContract(ns, contract);

    }

    private async onFailedContract(ns: NS, contract: CodingContract) {
        await LogAPI.log(ns, `Wrong solution for contract ${contract.server.characteristics.host}/${contract.filename}`, true, LogMessageCode.CODING_CONTRACT);
    }

    private async onSolveContract(ns: NS, contract: CodingContract) {
        await LogAPI.log(ns, `Solved contract ${contract.server.characteristics.host}/${contract.filename}`, true, LogMessageCode.CODING_CONTRACT);
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