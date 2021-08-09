import * as ControlFlowAPI from '/src/api/ControlFlowAPI.js';
export async function main(ns) {
    await ControlFlowAPI.killDaemon(ns);
    await ControlFlowAPI.killAllManagers(ns);
    // Clear the queue
    ControlFlowAPI.clearPorts(ns);
    ns.exit();
}
