import type { BitBurner as NS }                          from 'Bitburner'
import { IServer, ServerCharacteristics, ServerPurpose } from '/src/interfaces/ServerInterfaces.js'
import { CONSTANT }                                      from '/src/lib/constants.js'
import * as ServerUtils                                  from '/src/util/ServerUtils.js'

export default class Server {

	characteristics: ServerCharacteristics

	purpose: ServerPurpose
	reservation: number
	files: string[]


	public constructor(ns: NS, server: Partial<IServer>) {

		if (!server.characteristics) throw new Error("Cannot initialize the server without its characteristics")

		this.characteristics = server.characteristics

		this.purpose     = (server.purpose) ? server.purpose : ServerPurpose.NONE
		this.reservation = (server.reservation) ? server.reservation : 0

		this.files = ns.ls(this.characteristics.host)
	}

	public getAvailableRam(ns: NS): number {
		const [total, used] = ns.getServerRam(this.characteristics.host)
		return total - used - this.reservation - ((ServerUtils.isHomeServer(this)) ? CONSTANT.DESIRED_HOME_FREE_RAM : 0)
	}

	public getTotalRam(ns: NS): number {
		return ns.getServerRam(this.characteristics.host)[0]
	}

	public getUsedRam(ns: NS): number {
		return ns.getServerRam(this.characteristics.host)[1]
	}

	public isRooted(ns: NS): boolean {
		return ns.hasRootAccess(this.characteristics.host)
	}

	public increaseReservation(ns: NS, reservation: number): void {
		if (reservation > this.getAvailableRam(ns)) throw new Error('Not enough ram available to make a reservation')
		this.reservation += reservation
	}

	public decreaseReservation(ns: NS, reservation: number): void {
		if (reservation > this.reservation) throw new Error('No reservation of that size has been made yet')
		this.reservation -= reservation
	}

	public toJSON() {
		return {
			characteristics: this.characteristics,
			purpose: this.purpose,
			reservation: this.reservation,
		}
	}
}