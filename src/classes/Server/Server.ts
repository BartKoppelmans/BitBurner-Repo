import type { BitBurner as NS }                          from 'Bitburner'
import { IServer, ServerCharacteristics, ServerPurpose } from '/src/classes/Server/ServerInterfaces.js'
import { CONSTANT }                                      from '/src/lib/constants.js'
import * as ServerUtils                                  from '/src/util/ServerUtils.js'

export default class Server implements IServer {

	characteristics: ServerCharacteristics

	purpose: ServerPurpose = ServerPurpose.NONE
	reservation: number

	public constructor(ns: NS, server: Partial<IServer>) {
		if (!server.characteristics) throw new Error('Cannot initialize the server without its characteristics')

		this.characteristics = server.characteristics
		this.reservation     = (server.reservation) ? server.reservation : 0
		if (server.purpose) this.purpose = server.purpose
	}

	public getAvailableRam(ns: NS): number {
		return this.getTotalRam(ns) - this.getUsedRam(ns) - this.reservation - ((ServerUtils.isHomeServer(this)) ? CONSTANT.DESIRED_HOME_FREE_RAM : 0)
	}

	public getTotalRam(ns: NS): number {
		return ns.getServerMaxRam(this.characteristics.host)
	}

	public getUsedRam(ns: NS): number {
		return ns.getServerUsedRam(this.characteristics.host)
	}

	public isRooted(ns: NS): boolean {
		return ns.hasRootAccess(this.characteristics.host)
	}

	public increaseReservation(ns: NS, reservation: number): void {
		if (reservation > this.getAvailableRam(ns)) throw new Error('Not enough ram available to make a reservation')
		this.reservation += reservation
	}

	public decreaseReservation(ns: NS, reservation: number): void {

		// NOTE: This should fix rounding issues
		this.reservation = Math.round(this.reservation * 100) / 100

		if (reservation > this.reservation) throw new Error('No reservation of that size has been made yet')
		this.reservation -= reservation
	}

	public hasPurpose(purpose: ServerPurpose): boolean {
		return this.purpose === purpose
	}

	public toJSON() {
		return {
			characteristics: this.characteristics,
			purpose: this.purpose,
			reservation: Math.round(this.reservation * 100) / 100,
		}
	}
}