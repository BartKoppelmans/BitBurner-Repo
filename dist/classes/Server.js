import { ServerPurpose } from '/src/interfaces/ServerInterfaces.js';
import { CONSTANT } from '/src/lib/constants.js';
import * as ServerUtils from '/src/util/ServerUtils.js';
export default class Server {
    constructor(ns, characteristics, treeStructure, purpose = ServerPurpose.NONE) {
        this.reservation = 0;
        this.characteristics = characteristics;
        this.purpose = purpose;
        this.files = ns.ls(this.characteristics.host);
        if (treeStructure)
            this.updateTreeStructure(treeStructure);
    }
    updateTreeStructure(treeStructure) {
        if (!treeStructure.connections && !treeStructure.children && !treeStructure.parent) {
            return;
        }
        if (!this.treeStructure) {
            this.treeStructure = {};
        }
        if (treeStructure.connections)
            this.treeStructure.connections = treeStructure.connections;
        if (treeStructure.children)
            this.treeStructure.children = treeStructure.children;
        if (treeStructure.parent)
            this.treeStructure.parent = treeStructure.parent;
    }
    getAvailableRam(ns) {
        const [total, used] = ns.getServerRam(this.characteristics.host);
        return total - used - this.reservation - ((ServerUtils.isHomeServer(this)) ? CONSTANT.DESIRED_HOME_FREE_RAM : 0);
    }
    getTotalRam(ns) {
        return ns.getServerRam(this.characteristics.host)[0];
    }
    getUsedRam(ns) {
        return ns.getServerRam(this.characteristics.host)[1];
    }
    isRooted(ns) {
        return ns.hasRootAccess(this.characteristics.host);
    }
    setPurpose(purpose) {
        this.purpose = purpose;
    }
    setReservation(reservation) {
        this.reservation = reservation;
    }
    increaseReservation(ns, reservation) {
        if (reservation > this.getAvailableRam(ns))
            throw new Error('Not enough ram available to make a reservation');
        this.reservation += reservation;
    }
    decreaseReservation(ns, reservation) {
        if (reservation > this.reservation)
            throw new Error('No reservation of that size has been made yet');
        this.reservation -= reservation;
    }
    toJSON() {
        return {
            characteristics: this.characteristics,
            treeStructure: this.treeStructure,
            purpose: this.purpose,
            reservation: this.reservation,
        };
    }
}
