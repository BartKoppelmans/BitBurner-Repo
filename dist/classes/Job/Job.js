import * as LogAPI from '/src/api/LogAPI.js';
import { CONSTANT } from '/src/lib/constants.js';
import * as ServerUtils from '/src/util/ServerUtils.js';
import * as ToolUtils from '/src/util/ToolUtils.js';
export default class Job {
    batchId;
    id;
    cycleId;
    cycleTask;
    pids;
    target;
    threads;
    threadSpread;
    tool;
    isPrep;
    start;
    end;
    finished;
    constructor(ns, job) {
        this.id = job.id;
        this.target = job.target;
        this.threads = job.threads;
        this.tool = job.tool;
        this.isPrep = job.isPrep;
        this.start = job.start;
        this.end = job.end;
        this.threadSpread = job.threadSpread;
        this.batchId = job.batchId;
        this.finished = (job.finished) ? job.finished : false;
        this.pids = (job.pids) ? job.pids : [];
        if (job.cycleId)
            this.cycleId = job.cycleId;
        if (job.cycleTask)
            this.cycleTask = job.cycleTask;
        if (this.threads <= 0)
            throw new Error('Cannot create a job with less than 1 thread');
    }
    static createArgumentArray(ns, args) {
        return [
            args.script,
            args.server,
            args.threads,
            '--target',
            args.target.characteristics.host,
            '--start',
            args.start.getTime().toString(),
        ];
    }
    async execute(ns) {
        const commonArgs = {
            script: this.tool,
            target: this.target,
            start: this.start,
        };
        for (const [server, threads] of this.threadSpread) {
            // We have to copy the tool to the server if it is not available yet
            if (!ServerUtils.isHome(server)) {
                await ns.scp(this.tool, CONSTANT.HOME_SERVER_HOST, server);
            }
            const args = { ...commonArgs, threads, server };
            const pid = ns.exec.apply(null, Job.createArgumentArray(ns, args));
            if (pid === 0)
                LogAPI.printLog(ns, 'Could not successfully start the process');
            else
                this.pids.push(pid);
        }
    }
    onStart(ns) {
        // this.print(ns, false, false)
    }
    onFinish(ns) {
        // this.print(ns, true, false)
        const toolName = ToolUtils.getToolName(this.tool).padEnd(7, '');
        LogAPI.printLog(ns, `${toolName} -> sec: ${ns.nFormat(this.target.getSecurityLevel(ns), '0.000')} / ${ns.nFormat(this.target.staticHackingProperties.minSecurityLevel, '0.000')} - money: ${ns.nFormat(this.target.getMoney(ns), '$0.000a')} / ${ns.nFormat(this.target.staticHackingProperties.maxMoney, '$0.000a')}`);
    }
    onCancel(ns) {
        // this.print(ns, false, true)
    }
    toJSON() {
        return {
            pids: this.pids,
            batchId: this.batchId,
            id: this.id,
            cycleId: this.cycleId,
            cycleTask: this.cycleTask,
            target: this.target,
            threads: this.threads,
            tool: this.tool,
            isPrep: this.isPrep,
            start: this.start.getTime(),
            end: this.end.getTime(),
            threadSpread: Array.from(this.threadSpread.entries()),
            finished: this.finished,
        };
    }
    print(ns, isFinished, isCanceled) {
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
        LogAPI.printLog(ns, `${this.id} ${verb} ${this.target.characteristics.host} - ${ToolUtils.getToolName(this.tool)}`);
    }
}
