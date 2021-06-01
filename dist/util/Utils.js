export default class Utils {
    static tprintColored(text, printDate = false, color = "var(--my-font-color)") {
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
    static formatTime(date = new Date()) {
        return `[${date.toLocaleTimeString()}]`;
    }
}
