const GANG_MEMBER_NAME_FILE = '/src/lib/names.txt';
export function generateName(ns) {
    const names = JSON.parse(ns.read(GANG_MEMBER_NAME_FILE));
    return names[Math.floor(Math.random() * names.length)];
}
export function isHackingGang(ns) {
    return ns.gang.getGangInformation().isHacking;
}
