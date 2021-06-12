export async function rootAllServers(ns) {
    // nope not yet
    return;
}
export function startProgramManager(ns) {
    ns.exec('/src/managers/ProgramManager.js', ns.getHostname());
}
export function isProgramManagerRunning(ns) {
    return ns.isRunning('/src/managers/ProgramManager.js', ns.getHostname());
}
