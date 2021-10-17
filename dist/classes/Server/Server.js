import { ServerPurpose } from '/src/classes/Server/ServerInterfaces.js';
import { CONSTANT } from '/src/lib/constants.js';
import * as ServerUtils from '/src/util/ServerUtils.js';
export default class Server {
    characteristics;
    purpose = ServerPurpose.NONE;
    reservation;
    constructor(ns, server) {
        if (!server.characteristics)
            throw new Error('Cannot initialize the server without its characteristics');
        this.characteristics = server.characteristics;
        this.reservation = (server.reservation) ? server.reservation : 0;
        if (server.purpose)
            this.purpose = server.purpose;
    }
    getAvailableRam(ns) {
        return this.getTotalRam(ns) - this.getUsedRam(ns) - this.reservation - ((ServerUtils.isHomeServer(this)) ? CONSTANT.DESIRED_HOME_FREE_RAM : 0);
    }
    getTotalRam(ns) {
        return ns.getServerMaxRam(this.characteristics.host);
    }
    getUsedRam(ns) {
        return ns.getServerUsedRam(this.characteristics.host);
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
        this.reservation = Math.round(this.reservation * 100) / 100;
        if (reservation > this.reservation)
            throw new Error('No reservation of that size has been made yet');
        this.reservation -= reservation;
    }
    hasPurpose(purpose) {
        return this.purpose === purpose;
    }
    toJSON() {
        return {
            characteristics: this.characteristics,
            purpose: this.purpose,
            reservation: Math.round(this.reservation * 100) / 100,
        };
    }
}
