export function tprintColored(text, printDate = false, color = "var(--my-font-color)") {
    let terminalInput = document.getElementById("terminal-input");
    let rowElement = document.createElement("tr");
    let cellElement = document.createElement("td");
    if (!terminalInput) {
        throw new Error("Could not find the terminal input.");
    }
    if (printDate) {
        text = formatTime() + " " + text;
    }
    rowElement.classList.add("posted");
    cellElement.classList.add("terminal-line");
    cellElement.style.color = color;
    cellElement.innerText = text;
    rowElement.appendChild(cellElement);
    terminalInput.before(rowElement);
    terminalInput.scrollIntoView(false);
}
export function formatTime(date = new Date()) {
    return `[${date.toLocaleTimeString()}]`;
}
export function generateHash() {
    return [...Array(32)].map(() => Math.random().toString(36)[2]).join('');
}
