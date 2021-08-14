import { ServerPurpose } from '/src/classes/Server/ServerInterfaces.js';
import { CONSTANT } from '/src/lib/constants.js';
import * as ServerUtils from '/src/util/ServerUtils.js';
export default class Server {
    constructor(ns, server) {
        if (!server.characteristics)
            throw new Error('Cannot initialize the server without its characteristics');
        this.characteristics = server.characteristics;
        this.purpose = (server.purpose) ? server.purpose : ServerPurpose.NONE;
        this.reservation = (server.reservation) ? +server.reservation.toFixed(2) : 0;
        this.files = ns.ls(this.characteristics.host);
    }
    getAvailableRam(ns) {
        const [total, used] = ns.getServerRam(this.characteristics.host);
        return total - used - (+this.reservation.toFixed(2)) - ((ServerUtils.isHomeServer(this)) ? CONSTANT.DESIRED_HOME_FREE_RAM : 0);
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
    increaseReservation(ns, reservation) {
        if (reservation > this.getAvailableRam(ns))
            throw new Error('Not enough ram available to make a reservation');
        this.reservation += reservation;
    }
    decreaseReservation(ns, reservation) {
        // NOTE: This should fix rounding issues
        this.reservation = +this.reservation.toFixed(2);
        if (reservation > this.reservation)
            throw new Error('No reservation of that size has been made yet');
        this.reservation -= reservation;
    }
    toJSON() {
        return {
            characteristics: this.characteristics,
            purpose: this.purpose,
            reservation: +this.reservation.toFixed(2),
        };
    }
}
