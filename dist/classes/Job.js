import * as LogAPI from "/src/api/LogAPI.js";
import HackableServer from "/src/classes/HackableServer.js";
import Server from "/src/classes/Server.js";
import { LogMessageCode } from "/src/interfaces/PortMessageInterfaces.js";
import { ServerType } from "/src/interfaces/ServerInterfaces.js";
import { CONSTANT } from "/src/lib/constants.js";
import * as HackUtils from "/src/util/HackUtils.js";
import * as ServerUtils from "/src/util/ServerUtils.js";
import * as ToolUtils from "/src/util/ToolUtils.js";
let jobIdCounter = 0;
export default class Job {
    constructor(ns, job) {
        this.target = job.target;
        this.threads = job.threads;
        this.tool = job.tool;
        this.isPrep = job.isPrep;
        // Setting some default values in case they were not provided
        this.allowSpreading = (job.allowSpreading) ? job.allowSpreading : true;
        this.id = (job.id) ? job.id : ++jobIdCounter;
        this.start = (job.start) ? job.start : new Date(Date.now() + CONSTANT.INITIAL_JOB_DELAY);
        if (job.threadSpread)
            this.threadSpread = job.threadSpread;
        if (job.cycleId)
            this.cycleId = job.cycleId;
        if (job.end)
            this.end = job.end;
        else {
            const executionTime = ToolUtils.getToolTime(ns, this.tool, this.target) * CONSTANT.MILLISECONDS_IN_SECOND;
            this.end = new Date(this.start.getTime() + executionTime);
        }
    }
    async execute(ns) {
        if (!this.threadSpread) {
            this.threadSpread = await HackUtils.computeThreadSpread(ns, this.tool, this.threads, this.isPrep);
        }
        const commonArgs = {
            script: this.tool,
            target: this.target,
            start: this.start,
        };
        for (let [server, threads] of this.threadSpread) {
            // Validate the threadspread before running (for hacking)
            const cost = threads * ToolUtils.getToolCost(ns, this.tool);
            if (cost > server.getAvailableRam(ns)) {
                throw new Error("Not enough RAM available.");
            }
            // We have to copy the tool to the server if it is not available yet
            if (!ServerUtils.isHomeServer(server)) {
                ns.scp(this.tool, CONSTANT.HOME_SERVER_HOST, server.characteristics.host);
            }
            const args = { ...commonArgs, threads, server };
            ns.exec.apply(null, this.createArgumentArray(ns, args));
        }
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
            args.server.characteristics.host,
            args.threads,
            args.target.characteristics.host,
            args.start.getTime().toString()
        ];
    }
    toJSON() {
        const object = {
            id: this.id,
            cycleId: this.cycleId,
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
    static parseJobString(ns, jobString) {
        const object = JSON.parse(jobString);
        let spreadMap = undefined;
        if (object.threadSpread) {
            spreadMap = new Map();
            object.threadSpread.forEach((pair) => {
                const parsedServer = pair[0];
                const threads = pair[1];
                let server;
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
                if (spreadMap) {
                    spreadMap.set(server, threads);
                }
            });
        }
        const target = new HackableServer(ns, object.target.characteristics, object.target.treeStructure, object.target.purpose);
        return new Job(ns, {
            id: object.id,
            cycleId: object.cycleId,
            target: target,
            threads: object.threads,
            threadSpread: spreadMap,
            tool: object.tool,
            start: new Date(object.start),
            end: new Date(object.end),
            isPrep: object.isPrep,
        });
    }
    async print(ns, isFinished) {
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
        if (CONSTANT.DEBUG_HACKING) {
            await LogAPI.log(ns, `${ns.nFormat(this.id, "000000")} ${verb} ${this.target.characteristics.host} - ${ToolUtils.getToolName(this.tool)}`, true, LogMessageCode.WARNING);
        }
    }
}
