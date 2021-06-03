import { Tools } from "/src/tools/Tools.js";
export function getToolCost(ns, tool) {
    return ns.getScriptRam(tool);
}
export function getToolTime(ns, tool, server) {
    switch (tool) {
        case Tools.GROW:
            return ns.getGrowTime(server.host);
        case Tools.WEAKEN:
            return ns.getWeakenTime(server.host);
        case Tools.HACK:
            return ns.getHackTime(server.host);
        default:
            throw new Error("Tool not recognized");
    }
}
export function getToolName(tool) {
    switch (tool) {
        case Tools.WEAKEN:
            return "weaken";
        case Tools.HACK:
            return "hack";
        case Tools.GROW:
            return "grow";
        default:
            throw new Error("Tool not recognized");
    }
}
