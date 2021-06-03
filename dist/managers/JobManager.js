class JobManager {
    constructor() {
        this.jobs = [];
        this.jobIdCounter = 0;
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
        return [...new Set(this.jobs.map(job => job.target))];
    }
}
export const jobManager = new JobManager();
