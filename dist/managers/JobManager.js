import { CONSTANT } from "/src/lib/constants.js";
export default class JobManager {
    constructor() {
        this.jobs = [];
        this.jobIdCounter = 0;
        this.managingLoopIntervals = [];
    }
    static getInstance() {
        if (!JobManager.instance) {
            JobManager.instance = new JobManager();
        }
        return JobManager.instance;
    }
    async startManagingLoop(ns) {
        if (this.managingLoopIntervals.length > 0) {
            for (const interval of this.managingLoopIntervals) {
                clearInterval(interval);
            }
            this.managingLoopIntervals = [];
        }
        const ports = [...CONSTANT.JOB_PORT_NUMBERS];
        for (const port of ports) {
            this.managingLoopIntervals.push(setInterval(this.managingLoop, CONSTANT.JOB_MANAGING_LOOP_INTERVAL, ns, port));
            this.managingLoop(ns, port);
        }
    }
    async managingLoop(ns, port) {
        const portHandle = ns.getPortHandle(port);
        if (portHandle.empty())
            return;
        do {
            const jobString = portHandle.read().toString();
            // TODO: Parse the job from the job string
            ns.tprint(jobString);
        } while (!portHandle.empty());
    }
    startJob(ns, job) {
        this.jobs.push(job);
        job.onStart(ns);
        setTimeout(this.finishJob, job.end.getTime() - Date.now(), ns, job.id);
    }
    finishJob(ns, id) {
        const index = this.jobs.findIndex(job => job.id === id);
        if (index === -1) {
            throw new Error("Could not find the job");
        }
        const job = this.jobs.splice(index, 1)[0];
        job.onFinish(ns);
    }
    isPrepping(ns, server) {
        return this.jobs.some((job) => {
            return job.target === server && job.isPrep;
        });
    }
    isTargetting(ns, server) {
        return this.jobs.some((job) => {
            return job.target === server && !job.isPrep;
        });
    }
    getNextJobId() {
        return ++this.jobIdCounter;
    }
    getCurrentTargets() {
        const targets = [...new Set(this.jobs.map(job => job.target))];
        return targets;
    }
}
;
