import type { BitBurner as NS, PortHandle } from "Bitburner";
import HackableServer from "/src/classes/HackableServer.js";
import Server from "/src/classes/Server.js";
import { ExecArguments, IJOb, ToolArguments } from "/src/interfaces/JobInterfaces.js";
import { CONSTANT } from "/src/lib/constants.js";
import { Tools } from "/src/tools/Tools.js";
import * as JobUtils from "/src/util/JobUtils.js";
import * as ToolUtils from "/src/util/ToolUtils.js";
import * as Utils from "/src/util/Utils.js";
import * as ServerUtils from "/src/util/ServerUtils.js";
import HomeServer from "/src/classes/HomeServer.js";
import PurchasedServer from "/src/classes/PurchasedServer.js";

let jobIdCounter: number = 0;

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
        this.target = job.target;
        this.threads = job.threads;
        this.tool = job.tool;
        this.isPrep = job.isPrep;

        // Setting some default values in case they were not provided
        this.allowSpreading = (job.allowSpreading) ? job.allowSpreading : true;
        this.id = (job.id) ? job.id : ++jobIdCounter;
        this.start = (job.start) ? job.start : new Date();

        if (job.threadSpread) this.threadSpread = job.threadSpread;

        if (job.end) this.end = job.end;
        else {
            const executionTime: number = ToolUtils.getToolTime(ns, this.tool, this.target) * CONSTANT.MILLISECONDS_IN_SECOND;
            this.end = new Date(this.start.getTime() + executionTime);
        }
    }

    public async execute(ns: NS) {

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

        // TODO: Communicate the job
        await JobUtils.communicateJob(ns, this);
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

    public toJSON() {

        const object: any = {
            id: this.id,
            target: this.target,
            threads: this.threads,
            tool: this.tool,
            isPrep: this.isPrep,
            start: this.start.getTime(),
            end: this.end.getTime(),
        };

        if (this.threadSpread) {
            object.threadSpread = Array.from(this.threadSpread.entries());
        }

        return object;
    }


    /* 
        {"id":302,"target":"defcomm","threadSpread":{},"tool":"/src/tools/weaken.js","isPrep":false,"start":1623030787309,"end":1623031719451}
    */
    public static parseJobString(ns: NS, jobString: string): Job {
        const object: any = JSON.parse(jobString);

        let spreadMap: Map<Server, number> = new Map<Server, number>();

        object.threadSpread.forEach((pair: any[]) => {

            const host: string = pair[0];
            const threads: number = pair[1];

            let server: Server;
            if (ServerUtils.isPurchased(host)) {
                server = new PurchasedServer(ns, host);
            } else if (ServerUtils.isHome(host)) {
                server = HomeServer.getInstance(ns);
            } else if (ServerUtils.isDarkweb(host)) {
                server = new Server(ns, host);
            } else {
                server = new HackableServer(ns, host);
            }

            spreadMap.set(server, threads);
        });

        const target: HackableServer = new HackableServer(ns, object.target);

        return new Job(ns, {
            id: object.id,
            target: target,
            threads: object.threads,
            threadSpread: spreadMap,
            tool: object.tool,
            start: new Date(object.start),
            end: new Date(object.end),
            isPrep: object.isPrep,
        });
    }

    private print(ns: NS, isFinished: boolean): void {
        let verb: string;

        if (this.isPrep && !isFinished) verb = "Prepping";
        else if (this.isPrep && isFinished) verb = "Finished prepping";
        else if (!this.isPrep && !isFinished) verb = "Attacking";
        else if (!this.isPrep && isFinished) verb = "Finished attacking";
        else throw new Error("This should logically never happen.");

        if (CONSTANT.DEBUG_HACKING) {
            Utils.tprintColored(`${ns.nFormat(this.id, "000000")} ${verb} ${this.target.host} - ${ToolUtils.getToolName(this.tool)}`, true, CONSTANT.COLOR_HACKING);
        }
    }
}