import Server from '/src/classes/Server/Server.js';
import { ServerType } from '/src/classes/Server/ServerInterfaces.js';
import HackableServer from '/src/classes/Server/HackableServer.js';
import PurchasedServer from '/src/classes/Server/PurchasedServer.js';
import Job from '/src/classes/Job/Job.js';
import Batch from '/src/classes/Job/Batch.js';
export function serverFromJSON(ns, json) {
    switch (+json.characteristics.type) {
        case ServerType.HackableServer:
            return new HackableServer(ns, json);
        case ServerType.PurchasedServer:
            return new PurchasedServer(ns, json);
        case ServerType.BasicServer:
        case ServerType.HomeServer:
        case ServerType.DarkWebServer:
            return new Server(ns, json);
        default:
            throw new Error('Server type not recognized.');
    }
}
export function jobFromJSON(ns, json) {
    const spreadMap = new Map();
    json.threadSpread.forEach((pair) => {
        spreadMap.set(pair[0], pair[1]);
    });
    const target = new HackableServer(ns, json.target);
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
    });
}
export function batchFromJSON(ns, json) {
    const jobs = json.jobs.map((job) => jobFromJSON(ns, job));
    return new Batch(ns, {
        batchId: json.batchId,
        target: serverFromJSON(ns, json.target),
        jobs,
        start: new Date(json.start),
        end: new Date(json.end),
    });
}
