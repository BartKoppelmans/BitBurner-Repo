import type { BitBurner as NS } from "Bitburner";
import * as ControlFlowAPI from "/src/api/ControlFlowAPI.js";
import { LogMessageCode, LogMessageRequest } from "/src/interfaces/PortMessageInterfaces.js";
import { CONSTANT } from "/src/lib/constants.js";
import * as ServerManagerUtils from "/src/util/ServerManagerUtils.js";
import * as Utils from "/src/util/Utils.js";

class LogManager {

    private loggingLoopInterval?: ReturnType<typeof setInterval>;

    public constructor() { }

    public async initialize(ns: NS): Promise<void> {
        Utils.disableLogging(ns);

        if (this.loggingLoopInterval) {
            clearInterval(this.loggingLoopInterval);
        }
    }

    public async start(ns: NS): Promise<void> {
        this.tprintColored(`Starting the ServerManager`, true, CONSTANT.COLOR_INFORMATION);

        this.loggingLoopInterval = setInterval(this.loggingLoop.bind(this, ns), CONSTANT.LOGGING_INTERVAL);

    }

    public async onDestroy(ns: NS): Promise<void> {
        ServerManagerUtils.clearServerMap(ns);

        if (this.loggingLoopInterval) {
            clearInterval(this.loggingLoopInterval);
        }

        this.tprintColored(`Stopping the ServerManager`, true, CONSTANT.COLOR_INFORMATION);
    }

    private async loggingLoop(ns: NS): Promise<void> {

        const requestPortHandle = ns.getPortHandle(CONSTANT.LOG_MANAGER_REQUEST_PORT);
        if (requestPortHandle.empty()) return;

        const requests: LogMessageRequest[] = requestPortHandle.data.map((string) => JSON.parse(string.toString()));

        // NOTE: This could go wrong
        requestPortHandle.clear();

        for await (const request of requests) {
            let color: string;
            switch (+request.code) {
                case LogMessageCode.INFORMATION:
                    color = CONSTANT.COLOR_INFORMATION;
                    break;
                case LogMessageCode.WARNING:
                    color = CONSTANT.COLOR_WARNING;
                    break;
                case LogMessageCode.HACKING:
                    color = CONSTANT.COLOR_HACKING;
                    break;
                case LogMessageCode.PURCHASED_SERVER:
                    color = CONSTANT.COLOR_PURCHASED_SERVER_INFORMATION;
                    break;
                case LogMessageCode.CODING_CONTRACT:
                    color = CONSTANT.COLOR_CODING_CONTRACT_INFORMATION;
                    break;
                default:
                    color = "var(--my-font-color)";
            }

            this.tprintColored(request.body.message, request.body.printDate, color);
        }
    }

    public tprintColored(text: string, printDate: boolean = false, color: string) {
        let terminalInput = document.getElementById("terminal-input");
        let rowElement = document.createElement("tr");
        let cellElement = document.createElement("td");

        if (!terminalInput) {
            throw new Error("Could not find the terminal input.");
        }

        if (printDate) {
            text = Utils.formatTime() + " " + text;
        }

        rowElement.classList.add("posted");
        cellElement.classList.add("terminal-line");
        cellElement.style.color = color;
        cellElement.innerText = text;

        rowElement.appendChild(cellElement);
        terminalInput.before(rowElement);

        terminalInput.scrollIntoView(false);
    }
}

export async function main(ns: NS) {
    if (ns.getHostname() !== 'home') {
        throw new Error('Run the script from home');
    }

    const instance: LogManager = new LogManager();

    await instance.initialize(ns);
    await instance.start(ns);

    // We just keep sleeping because we have to keep this script running
    while (true) {
        const shouldKill: boolean = await ControlFlowAPI.hasLogManagerKillRequest(ns);

        if (shouldKill) {
            await instance.onDestroy(ns);
            ns.exit();
        }

        await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL);
    }
}