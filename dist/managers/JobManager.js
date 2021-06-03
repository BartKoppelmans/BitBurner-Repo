let jobs = [];
let jobIdCounter = 0;
export default class JobManager {
    constructor() { }
    static getInstance() {
        if (!JobManager.instance) {
            JobManager.instance = new JobManager();
        }
        return JobManager.instance;
    }
    startJob(ns, job) {
        jobs.push(job);
        job.onStart(ns);
        setTimeout(this.finishJob, job.end.getTime() - Date.now(), ns, job.id);
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
    getNextJobId() {
        return ++jobIdCounter;
    }
    getCurrentTargets() {
        return [...new Set(jobs.map(job => job.target))];
        ;
    }
}
;
