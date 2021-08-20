import * as ControlFlowAPI from '/src/api/ControlFlowAPI.js';
import * as LogAPI from '/src/api/LogAPI.js';
import { LogType } from '/src/api/LogAPI.js';
export async function main(ns) {
    const flags = ns.flags([
        ['force', false],
        ['f', false],
    ]);
    flags.force = flags.force || flags.f;
    await ControlFlowAPI.killDaemon(ns);
    await ControlFlowAPI.killAllManagers(ns);
    // Clear the queue
    ControlFlowAPI.clearPorts(ns);
    if (flags.force) {
        await ControlFlowAPI.killAllScripts(ns);
    }
    LogAPI.log(ns, `Killed all scripts`, LogType.INFORMATION);
    ns.exit();
}
