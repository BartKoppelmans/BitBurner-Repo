import Job from "/src/classes/Job.js";
import { CONSTANT } from "/src/lib/constants.js";
let managingLoopIntervals = [];
let jobs = [];
export default class JobManager {
    constructor() { }
    static getInstance() {
        if (!JobManager.instance) {
            JobManager.instance = new JobManager();
        }
        return JobManager.instance;
    }
    async startManagingLoop(ns) {
        // Clear the ports
        this.clearAllPorts(ns);
        if (managingLoopIntervals.length > 0) {
            for (const interval of managingLoopIntervals) {
                clearInterval(interval);
            }
            managingLoopIntervals = [];
        }
        const ports = [...CONSTANT.JOB_PORT_NUMBERS];
        for (const port of ports) {
            const interval = setInterval(this.managingLoop.bind(this, ns, port), CONSTANT.JOB_MANAGING_LOOP_INTERVAL);
            managingLoopIntervals.push(interval);
            this.managingLoop(ns, port);
        }
    }
    async managingLoop(ns, port) {
        const portHandle = ns.getPortHandle(port);
        if (portHandle.empty())
            return;
        do {
            const jobString = portHandle.read().toString();
            const job = Job.parseJobString(ns, jobString);
            jobs.push(job);
            job.onStart(ns);
            setTimeout(this.finishJob.bind(this, ns, job.id), job.end.getTime() - Date.now());
            await ns.sleep(CONSTANT.SMALL_DELAY);
        } while (!portHandle.empty());
    }
    finishJob(ns, id) {
        const index = jobs.findIndex(job => job.id === id);
        if (index === -1) {
            throw new Error("Could not find the job");
        }
        const job = jobs.splice(index, 1)[0];
        job.onFinish(ns);
    }
    isPrepping(ns, server) {
        return jobs.some((job) => {
            return job.target === server && job.isPrep;
        });
    }
    isTargetting(ns, server) {
        return jobs.some((job) => {
            return job.target === server && !job.isPrep;
        });
    }
    getCurrentTargets() {
        return [...new Set(jobs.filter((job) => !job.isPrep).map(job => job.target.host))];
    }
    clearAllPorts(ns) {
        const ports = [...CONSTANT.JOB_PORT_NUMBERS];
        for (const port of ports) {
            const portHandle = ns.getPortHandle(port);
            portHandle.clear();
        }
    }
}
;
