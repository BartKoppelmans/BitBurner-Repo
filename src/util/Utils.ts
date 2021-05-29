import { Tools } from "/src/tools/Tools.js";

export default class Utils {

    static formatDate(date: Date = new Date()): string {
        return date.toLocaleString();
    }

    static getToolName(tool: Tools): string {
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