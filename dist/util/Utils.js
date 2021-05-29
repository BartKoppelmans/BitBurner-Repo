import { Tools } from "/src/tools/Tools.js";
export default class Utils {
    static formatDate(date = new Date()) {
        return `[${date.toLocaleString()}]`;
    }
    static formatHackId(ns, id) {
        return `[Hack ${ns.nFormat(id, "000000")}]`;
    }
    static getToolName(tool) {
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
}
