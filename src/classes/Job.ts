import type { BitBurner as NS } from "Bitburner";
import HackableServer from "/src/classes/HackableServer.js";
import Server from "/src/classes/Server.js";
import { ExecArguments, IJOb, ToolArguments } from "/src/interfaces/JobInterfaces.js";
import { ServerType } from "/src/interfaces/ServerInterfaces.js";
import { CONSTANT } from "/src/lib/constants.js";
import { Tools } from "/src/tools/Tools.js";
import * as HackUtils from "/src/util/HackUtils.js";
import * as JobUtils from "/src/util/JobUtils.js";
import * as ServerUtils from "/src/util/ServerUtils.js";
import * as ToolUtils from "/src/util/ToolUtils.js";
import * as Utils from "/src/util/Utils.js";

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
        this.start = (job.start) ? job.start : new Date(Date.now() + CONSTANT.INITIAL_JOB_DELAY);

        if (job.threadSpread) this.threadSpread = job.threadSpread;

        if (job.end) this.end = job.end;
        else {
            const executionTime: number = ToolUtils.getToolTime(ns, this.tool, this.target) * CONSTANT.MILLISECONDS_IN_SECOND;
            this.end = new Date(this.start.getTime() + executionTime);
        }
    }

    public async execute(ns: NS): Promise<void> {

        const maxThreadsAvailable: number = await HackUtils.calculateMaxThreads(ns, this.tool, this.isPrep);

        if (maxThreadsAvailable === 0) {
            // Cancel the batch
            throw new Error("No threads available");
        }

        if (this.threads > maxThreadsAvailable) {
            // TODO: How do we handle this
            // For now just use he minimum of the two
            this.threads = Math.min(this.threads, maxThreadsAvailable);
        }

        this.threadSpread = await JobUtils.computeThreadSpread(ns, this.tool, this.threads, this.isPrep);

        const commonArgs = {
            script: this.tool,
            target: this.target,
            start: this.start,
        };

        for (let [server, threads] of this.threadSpread) {
            // We have to copy the tool to the server if it is not available yet
            if (!ServerUtils.isHomeServer(server)) {
                ns.scp(this.tool, CONSTANT.HOME_SERVER_HOST, server.characteristics.host);
            }

            const args: ToolArguments = { ...commonArgs, threads, server };

            ns.exec.apply(null, this.createArgumentArray(ns, args));
        }
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
            args.server.characteristics.host,
            args.threads,
            args.target.characteristics.host,
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

    public static parseJobString(ns: NS, jobString: string): Job {
        const object: any = JSON.parse(jobString);

        let spreadMap: Map<Server, number> = new Map<Server, number>();

        if (object.threadSpread) {
            object.threadSpread.forEach((pair: any[]) => {

                const parsedServer: any = pair[0];
                const threads: number = pair[1];

                let server: Server;

                switch (+parsedServer.characteristics.type) {
                    case ServerType.HackableServer:
                        server = new HackableServer(ns, parsedServer.characteristics, parsedServer.treeStructure, parsedServer.purpose);
                        break;
                    case ServerType.BasicServer:
                    case ServerType.PurchasedServer:
                    case ServerType.HomeServer:
                    case ServerType.DarkWebServer:
                        server = new Server(ns, parsedServer.characteristics, parsedServer.treeStructure, parsedServer.purpose);
                        break;
                    default:
                        throw new Error("We did not recognize the server type.");
                }

                spreadMap.set(server, threads);
            });

        }

        const target: HackableServer = new HackableServer(ns, object.target.characteristics, object.target.treeStructure, object.target.purpose);

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
            Utils.tprintColored(`${ns.nFormat(this.id, "000000")} ${verb} ${this.target.characteristics.host} - ${ToolUtils.getToolName(this.tool)}`, true, CONSTANT.COLOR_HACKING);
        }
    }
}