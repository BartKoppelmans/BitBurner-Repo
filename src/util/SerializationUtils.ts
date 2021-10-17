import type { BitBurner as NS } from 'Bitburner'
import Server                   from '/src/classes/Server/Server.js'
import { ServerType }           from '/src/classes/Server/ServerInterfaces.js'
import HackableServer           from '/src/classes/Server/HackableServer.js'
import { PurchasedServer }      from '/src/classes/Server/PurchasedServer.js'
import Job                      from '/src/classes/Job/Job.js'
import Batch                    from '/src/classes/Job/Batch.js'
import { ThreadSpread }         from '/src/classes/Misc/HackInterfaces.js'
import { HacknetServer }        from '/src/classes/Server/HacknetServer.js'

export function serverFromJSON(ns: NS, json: any): Server {
	switch (+json.characteristics.type) {
		case ServerType.HackableServer:
			return new HackableServer(ns, json)
		case ServerType.PurchasedServer:
			return new PurchasedServer(ns, json)
		case ServerType.HacknetServer:
			return new HacknetServer(ns, json)
		case ServerType.BasicServer:
		case ServerType.HomeServer:
		case ServerType.DarkWebServer:
			return new Server(ns, json)
		default:
			throw new Error('Server type not recognized.')
	}
}

export function jobFromJSON(ns: NS, json: any): Job {
	const spreadMap: ThreadSpread = new Map<string, number>()

	json.threadSpread.forEach((pair: any[]) => {
		spreadMap.set(pair[0], pair[1])
	})

	const target: HackableServer = new HackableServer(ns, json.target)

	return new Job(ns, {
		target,
		pids: json.pids,
		batchId: json.batchId,
		id: json.id,
		cycleId: json.cycleId,
		threads: json.threads,
		threadSpread: spreadMap,
		tool: json.tool,
		start: new Date(json.start),
		end: new Date(json.end),
		isPrep: json.isPrep,
		finished: json.finished,
	})
}

export function batchFromJSON(ns: NS, json: any): Batch {

	const jobs: Job[] = json.jobs.map((job: any) => jobFromJSON(ns, job))

	return new Batch(ns, {
		batchId: json.batchId,
		target: serverFromJSON(ns, json.target) as HackableServer,
		jobs,
		start: new Date(json.start),
		end: new Date(json.end),
	})
}