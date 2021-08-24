export default class GangMember {
    constructor(ns, name) {
        this.name = name;
    }
    getStats(ns) {
        return ns.gang.getMemberInformation(this.name);
    }
    startTask(ns, task) {
        ns.gang.setMemberTask(this.name, task.name);
    }
}
