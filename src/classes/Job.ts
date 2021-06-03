import type { BitBurner as NS } from "Bitburner";
import HackableServer from "/src/classes/HackableServer.js";
import Server from "/src/classes/Server.js";
import { ExecArguments, IBatchJob, IJOb, ToolArguments } from "/src/interfaces/JobInterfaces.js";
import { CONSTANT } from "/src/lib/constants.js";
import { Tools } from "/src/tools/Tools.js";
import JobUtils from "/src/util/JobUtils.js";
import ToolUtils from "/src/util/ToolUtils.js";
import Utils from "/src/util/Utils.js";
import ServerUtils from "/src/util/ServerUtils.js";
import HomeServer from "/src/classes/HomeServer.js";
import { JobManager } from "/src/managers/JobManager.js";

export default class Job {
    id: number;
    target: HackableServer;
    threads: number;
    threadSpread?: Map<Server, number>;
    tool: Tools;
    isPrep: boolean;
    start: Date;
    end: Date;


    allowSpreading: boolean;

    public constructor(ns: NS, job: IJOb) {
        const jobManager: JobManager = JobManager.getInstance();

        this.target = job.target;
        this.threads = job.threads;
        this.tool = job.tool;
        this.isPrep = job.isPrep;

        // Setting some default values in case they were not provided
        this.allowSpreading = (job.allowSpreading) ? job.allowSpreading : true;
        this.id = (job.id) ? job.id : jobManager.getNextJobId();
        this.start = (job.start) ? job.start : new Date();

        if (job.end) this.end = job.end;
        else {
            const executionTime: number = ToolUtils.getToolTime(ns, this.tool, this.target) * CONSTANT.MILLISECONDS_IN_SECOND;
            this.end = new Date(this.start.getTime() + executionTime);
        }
    }

    public async execute(ns: NS) {

        const jobManager: JobManager = JobManager.getInstance();

        const maxThreadsAvailable: number = await JobUtils.computeMaxThreads(ns, this.tool, true);

        if (maxThreadsAvailable === 0) {
            // Cancel the batch
            throw new Error("No threads available");
        }

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

            const args: ToolArguments = { ...commonArgs, threads, server };

            ns.exec.apply(null, this.createArgumentArray(ns, args));
        }

        jobManager.startJob(ns, this);
    }

    public async onStart(ns: NS) {
        this.print(ns, false);
    }

    public async onFinish(ns: NS) {
        this.print(ns, true);
    }

    private createArgumentArray(ns: NS, args: ToolArguments): ExecArguments {
        return [
            args.script,
            args.server.host,
            args.threads,
            args.target.host,
            args.start.getTime().toString()
        ];
    }

    private print(ns: NS, isFinished: boolean): void {
        let verb: string;

        if (this.isPrep && !isFinished) verb = "Prepping";
        else if (this.isPrep && isFinished) verb = "Finished prepping";
        else if (!this.isPrep && !isFinished) verb = "Attacking";
        else if (!this.isPrep && isFinished) verb = "Finished attacking";
        else throw new Error("This should logically never happen.");

        Utils.tprintColored(`${ns.nFormat(this.id, "000000")} ${verb} ${this.target.host} - ${ToolUtils.getToolName(this.tool)}`);
    }
}