import { Tools } from "/src/tools/Tools.js";
export default class Utils {
    static tprintColored(text, color = "var(--my-font-color)", printDate = false) {
        let terminalInput = document.getElementById("terminal-input");
        let rowElement = document.createElement("tr");
        let cellElement = document.createElement("td");
        if (!terminalInput) {
            throw new Error("Could not find the terminal input.");
        }
        if (printDate) {
            text = Utils.formatTime() + text;
        }
        rowElement.classList.add("posted");
        cellElement.classList.add("terminal-line");
        cellElement.style.color = color;
        cellElement.innerText = text;
        rowElement.appendChild(cellElement);
        terminalInput.before(rowElement);
    }
    static formatTime(date = new Date()) {
        return `[${date.toLocaleTimeString()}]`;
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
