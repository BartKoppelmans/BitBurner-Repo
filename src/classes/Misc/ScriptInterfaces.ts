import type { BitBurner as NS } from 'Bitburner'

export interface Manager {
	initialize(ns: NS): Promise<void>

	start(ns: NS): Promise<void>

	destroy(ns: NS): Promise<void>
}

export interface Runner {
	run(ns: NS): Promise<void>
}