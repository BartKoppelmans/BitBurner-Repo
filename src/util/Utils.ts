export default class Utils {

    static tprintColored(text: string, printDate: boolean = false, color: string = "var(--my-font-color)") {
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

    static formatTime(date: Date = new Date()): string {
        return `[${date.toLocaleTimeString()}]`;
    }

}