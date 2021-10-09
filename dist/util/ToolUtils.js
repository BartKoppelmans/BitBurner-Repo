import { Tools } from '/src/tools/Tools.js';
export async function getToolCost(ns, tool) {
    return await ns.getScriptRam(tool);
}
export function getToolTime(ns, tool, server) {
    switch (tool) {
        case Tools.GROW:
            return ns.getGrowTime(server.characteristics.host);
        case Tools.WEAKEN:
            return ns.getWeakenTime(server.characteristics.host);
        case Tools.HACK:
            return ns.getHackTime(server.characteristics.host);
        default:
            throw new Error('Tool not recognized');
    }
}
export function getToolName(tool) {
    switch (tool) {
        case Tools.WEAKEN:
            return 'weaken';
        case Tools.HACK:
            return 'hack';
        case Tools.GROW:
            return 'grow';
        default:
            throw new Error('Tool not recognized');
    }
}
