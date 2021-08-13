import * as ControlFlowAPI from '/src/api/ControlFlowAPI.js';
import * as LogAPI from '/src/api/LogAPI.js';
import { LogType } from '/src/interfaces/LogInterfaces.js';
export async function main(ns) {
    await ControlFlowAPI.killDaemon(ns);
    await ControlFlowAPI.killAllManagers(ns);
    // Clear the queue
    ControlFlowAPI.clearPorts(ns);
    LogAPI.log(ns, `Killed all scripts`, LogType.INFORMATION);
    ns.exit();
}
