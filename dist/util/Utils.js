export function formatTime(date = new Date()) {
    return `[${date.toLocaleTimeString()}]`;
}
export function generateCycleHash() {
    return [...Array(8)].map(() => Math.random().toString(36)[2]).join('');
}
export function generateHash() {
    return [...Array(32)].map(() => Math.random().toString(36)[2]).join('');
}
export function disableLogging(ns) {
    ns.disableLog("ALL");
}
