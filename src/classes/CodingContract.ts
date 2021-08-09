import type { BitBurner as NS, CodingContractTypes } from 'Bitburner'
import Server                                        from '/src/classes/Server.js'

export type CodingContractAnswer = string | string[] | number;

export class CodingContract {
	filename: string
	server: Server
	type: CodingContractTypes
	description: string
	data: string | number | number[] | number[][]

	public constructor(ns: NS, filename: string, server: Server) {
		this.filename    = filename
		this.server      = server
		this.type        = ns.codingcontract.getContractType(filename, server.characteristics.host)
		this.description = ns.codingcontract.getDescription(filename, server.characteristics.host)
		this.data        = ns.codingcontract.getData(filename, server.characteristics.host)
	}

	public attempt(ns: NS, answer: CodingContractAnswer): boolean {
		return ns.codingcontract.attempt(answer, this.filename, this.server.characteristics.host)
	}

	public toJSON() {
		return {
			filename: this.filename,
			server: this.server.characteristics.host,
			type: this.type,
		}
	}
}