import { CONSTANT } from "/src/lib/constants.js";
import JobUtils from "/src/util/JobUtils.js";
import ToolUtils from "/src/util/ToolUtils.js";
import Utils from "/src/util/Utils.js";
import ServerUtils from "/src/util/ServerUtils.js";
import HomeServer from "/src/classes/HomeServer.js";
import { JobManager } from "/src/managers/JobManager.js";
export default class Job {
    constructor(ns, job) {
        const jobManager = JobManager.getInstance();
        this.target = job.target;
        this.threads = job.threads;
        this.tool = job.tool;
        this.isPrep = job.isPrep;
        // Setting some default values in case they were not provided
        this.allowSpreading = (job.allowSpreading) ? job.allowSpreading : true;
        this.id = (job.id) ? job.id : jobManager.getNextJobId();
        this.start = (job.start) ? job.start : new Date();
        if (job.end)
            this.end = job.end;
        else {
            const executionTime = ToolUtils.getToolTime(ns, this.tool, this.target) * CONSTANT.MILLISECONDS_IN_SECOND;
            this.end = new Date(this.start.getTime() + executionTime);
        }
    }
    async execute(ns) {
        const jobManager = JobManager.getInstance();
        const maxThreadsAvailable = await JobUtils.computeMaxThreads(ns, this.tool, true);
        if (this.threads > maxThreadsAvailable) {
            // TODO: How do we handle this
            // For now just use he minimum of the two
            this.threads = Math.min(this.threads, maxThreadsAvailable);
        }
        this.threadSpread = await JobUtils.computeThreadSpread(ns, this.tool, this.threads);
        const commonArgs = {
            script: this.tool,
            target: this.target,
            start: this.start,
        };
        for (let [server, threads] of this.threadSpread) {
            // We have to copy the tool to the server if it is not available yet
            if (!ServerUtils.isHomeServer(server)) {
                ns.scp(this.tool, HomeServer.getInstance(ns).host, server.host);
            }
            const args = { ...commonArgs, threads, server };
            ns.exec.apply(null, this.createArgumentArray(ns, args));
        }
        jobManager.startJob(ns, this);
    }
    async onStart(ns) {
        this.print(ns, false);
    }
    async onFinish(ns) {
        this.print(ns, true);
    }
    createArgumentArray(ns, args) {
        return [
            args.script,
            args.server.host,
            args.threads,
            args.target.host,
            args.start.getTime().toString()
        ];
    }
    print(ns, isFinished) {
        let verb;
        if (this.isPrep && !isFinished)
            verb = "Prepping";
        else if (this.isPrep && isFinished)
            verb = "Finished prepping";
        else if (!this.isPrep && !isFinished)
            verb = "Attacking";
        else if (!this.isPrep && isFinished)
            verb = "Finished attacking";
        else
            throw new Error("This should logically never happen.");
        Utils.tprintColored(`${ns.nFormat(this.id, "000000")} ${verb} ${this.target.host} - ${ToolUtils.getToolName(this.tool)}`);
    }
}
