import * as LogAPI from '/src/api/LogAPI.js';
import { CONSTANT } from '/src/lib/constants.js';
import * as ServerUtils from '/src/util/ServerUtils.js';
import * as ToolUtils from '/src/util/ToolUtils.js';
export default class Job {
    constructor(ns, job) {
        this.id = job.id;
        this.target = job.target;
        this.threads = job.threads;
        this.tool = job.tool;
        this.isPrep = job.isPrep;
        this.start = job.start;
        this.end = job.end;
        this.threadSpread = job.threadSpread;
        if (job.cycleId)
            this.cycleId = job.cycleId;
        if (job.batchId)
            this.batchId = job.batchId;
        if (job.pid)
            this.pid = job.pid;
    }
    async execute(ns) {
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
        };
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
                ns.scp(this.tool, CONSTANT.HOME_SERVER_HOST, server.characteristics.host);
            }
            const args = { ...commonArgs, threads, server };
            this.pid = ns.exec.apply(null, Job.createArgumentArray(ns, args));
        }
    }
    async onStart(ns) {
        await this.print(ns, false, false);
    }
    async onFinish(ns) {
        await this.print(ns, true, false);
    }
    async onCancel(ns) {
        await this.print(ns, false, true);
    }
    static createArgumentArray(ns, args) {
        return [
            args.script,
            args.server.characteristics.host,
            args.threads,
            args.target.characteristics.host,
            args.start.getTime().toString(),
        ];
    }
    toJSON() {
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
        };
    }
    async print(ns, isFinished, isCanceled) {
        let verb;
        if (isCanceled)
            verb = (this.isPrep) ? 'Cancelled prep on' : 'Cancelled attack on';
        else if (this.isPrep && !isFinished)
            verb = 'Prepping';
        else if (this.isPrep && isFinished)
            verb = 'Finished prepping';
        else if (!this.isPrep && !isFinished)
            verb = 'Attacking';
        else if (!this.isPrep && isFinished)
            verb = 'Finished attacking';
        else
            throw new Error('This should logically never happen.');
        LogAPI.hack(ns, `${this.id} ${verb} ${this.target.characteristics.host} - ${ToolUtils.getToolName(this.tool)}`);
    }
}
