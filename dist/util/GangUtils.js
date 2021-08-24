import GangMember from '/src/classes/Gang/GangMember.js';
const GANG_MEMBER_NAME_FILE = '/src/lib/names.txt';
export function createGangMembers(ns) {
    const names = ns.gang.getMemberNames();
    return names.map((name) => new GangMember(ns, name));
}
export function generateName(ns) {
    const names = JSON.parse(ns.read(GANG_MEMBER_NAME_FILE));
    return names[Math.floor(Math.random() * names.length)];
}
