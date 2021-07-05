import * as ControlFlowAPI from "/src/api/ControlFlowAPI.js";
import { LogMessageCode } from "/src/interfaces/PortMessageInterfaces.js";
import { CONSTANT } from "/src/lib/constants.js";
import * as ServerManagerUtils from "/src/util/ServerManagerUtils.js";
import * as Utils from "/src/util/Utils.js";
class LogManager {
    constructor() { }
    async initialize(ns) {
        Utils.disableLogging(ns);
        if (this.loggingLoopInterval) {
            clearInterval(this.loggingLoopInterval);
        }
    }
    async start(ns) {
        this.tprintColored(`Starting the LogManager`, true, CONSTANT.COLOR_INFORMATION);
        this.loggingLoopInterval = setInterval(this.loggingLoop.bind(this, ns), CONSTANT.LOGGING_INTERVAL);
    }
    async onDestroy(ns) {
        ServerManagerUtils.clearServerMap(ns);
        if (this.loggingLoopInterval) {
            clearInterval(this.loggingLoopInterval);
        }
        this.tprintColored(`Stopping the LogManager`, true, CONSTANT.COLOR_INFORMATION);
    }
    async loggingLoop(ns) {
        const requestPortHandle = ns.getPortHandle(CONSTANT.LOG_MANAGER_REQUEST_PORT);
        if (requestPortHandle.empty())
            return;
        const requests = requestPortHandle.data.map((string) => JSON.parse(string.toString()));
        // NOTE: This could go wrong
        requestPortHandle.clear();
        for await (const request of requests) {
            let color;
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
    tprintColored(text, printDate = false, color) {
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
export async function main(ns) {
    if (ns.getHostname() !== 'home') {
        throw new Error('Run the script from home');
    }
    const instance = new LogManager();
    await instance.initialize(ns);
    await instance.start(ns);
    // We just keep sleeping because we have to keep this script running
    while (true) {
        const shouldKill = await ControlFlowAPI.hasManagerKillRequest(ns);
        if (shouldKill) {
            await ns.sleep(CONSTANT.LOG_MANAGER_KILL_DELAY);
            await instance.onDestroy(ns);
            ns.exit();
        }
        await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL);
    }
}
