export class Augmentation {
    constructor(ns, name) {
        this.name = name;
        this.stats = ns.getAugmentationStats(this.name);
        this.reputationRequirement = ns.getAugmentationRepReq(this.name);
        this.augmentationRequirement = ns.getAugmentationPrereq(this.name);
    }
    // Dynamic value
    getPrice(ns) {
        return ns.getAugmentationPrice(this.name);
    }
}
