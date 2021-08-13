import Server from '/src/classes/Server.js';
import { ServerType } from '/src/interfaces/ServerInterfaces.js';
import HackableServer from '/src/classes/HackableServer.js';
import PurchasedServer from '/src/classes/PurchasedServer.js';
import Job from '/src/classes/Job.js';
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
        const parsedServer = pair[0];
        const threads = pair[1];
        const server = serverFromJSON(ns, parsedServer);
        spreadMap.set(server, threads);
    });
    const target = new HackableServer(ns, json.target);
    return new Job(ns, {
        target,
        pid: json.pid,
        id: json.id,
        cycleId: json.cycleId,
        batchId: json.batchId,
        threads: json.threads,
        threadSpread: spreadMap,
        tool: json.tool,
        start: new Date(json.start),
        end: new Date(json.end),
        isPrep: json.isPrep,
    });
}