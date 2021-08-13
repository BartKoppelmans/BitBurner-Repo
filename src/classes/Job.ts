import type { BitBurner as NS }               from 'Bitburner'
import * as LogAPI                            from '/src/api/LogAPI.js'
import HackableServer                         from '/src/classes/HackableServer.js'
import Server                                 from '/src/classes/Server.js'
import { ExecArguments, IJOb, ToolArguments } from '/src/interfaces/JobInterfaces.js'
import { CONSTANT }                           from '/src/lib/constants.js'
import { Tools }                              from '/src/tools/Tools.js'
import * as ServerUtils                       from '/src/util/ServerUtils.js'
import * as ToolUtils                         from '/src/util/ToolUtils.js'

export default class Job {
	id: string
	cycleId?: string
	batchId?: string
	pid?: number

	target: HackableServer
	threads: number
	threadSpread: Map<Server, number>
	tool: Tools
	isPrep: boolean
	start: Date
	end: Date

	public constructor(ns: NS, job: IJOb) {
		this.id           = job.id
		this.target       = job.target
		this.threads      = job.threads
		this.tool         = job.tool
		this.isPrep       = job.isPrep
		this.start        = job.start
		this.end          = job.end
		this.threadSpread = job.threadSpread

		if (job.cycleId) this.cycleId = job.cycleId
		if (job.batchId) this.batchId = job.batchId

		if (job.pid) this.pid = job.pid

		if (this.threads <= 0) throw new Error('Cannot create a job with less than 1 thread')

	}

	public async execute(ns: NS): Promise<void> {

		/*
		 TODO: Find a solution on how to check this first, perhaps in JobAPI.startJob?

		 const availableThreads: number = await HackUtils.calculateMaxThreads(ns, Tools.WEAKEN, true)

		 if (this.threads > availableThreads) {
		 throw new Error('Not enough RAM available')
		 }

		 */

		const commonArgs = {
			script: this.tool,
			target: this.target,
			start: this.start,
		}

		for (const [server, threads] of this.threadSpread) {

			/*
			 NOTE: This is not needed anymore, since the cost is included in the reservation

			 // Validate the threadspread before running (for hacking)
			 if (cost > server.getAvailableRam(ns)) {
			 throw new Error('Not enough RAM available on the server.')
			 }

			 */

			// We have to copy the tool to the server if it is not available yet
			if (!ServerUtils.isHomeServer(server)) {
				ns.scp(this.tool, CONSTANT.HOME_SERVER_HOST, server.characteristics.host)
			}

			const args: ToolArguments = { ...commonArgs, threads, server }

			this.pid = ns.exec.apply(null, Job.createArgumentArray(ns, args))
		}
	}

	public async onStart(ns: NS) {
		await this.print(ns, false, false)
	}

	public async onFinish(ns: NS) {
		await this.print(ns, true, false)
	}

	public async onCancel(ns: NS) {
		await this.print(ns, false, true)
	}

	private static createArgumentArray(ns: NS, args: ToolArguments): ExecArguments {
		return [
			args.script,
			args.server.characteristics.host,
			args.threads,
			args.target.characteristics.host,
			args.start.getTime().toString(),
		]
	}

	public toJSON() {
		return {
			pid: this.pid,
			id: this.id,
			cycleId: this.cycleId,
			batchId: this.batchId,
			target: this.target,
			threads: this.threads,
			tool: this.tool,
			isPrep: this.isPrep,
			start: this.start.getTime(),
			end: this.end.getTime(),
			threadSpread: Array.from(this.threadSpread.entries()),
		}
	}

	private async print(ns: NS, isFinished: boolean, isCanceled: boolean): Promise<void> {
		let verb: string

		if (isCanceled) verb = (this.isPrep) ? 'Cancelled prep on' : 'Cancelled attack on'
		else if (this.isPrep && !isFinished) verb = 'Prepping'
		else if (this.isPrep && isFinished) verb = 'Finished prepping'
		else if (!this.isPrep && !isFinished) verb = 'Attacking'
		else if (!this.isPrep && isFinished) verb = 'Finished attacking'
		else throw new Error('This should logically never happen.')

		LogAPI.hack(ns, `${this.id} ${verb} ${this.target.characteristics.host} - ${ToolUtils.getToolName(this.tool)}`)
	}
}