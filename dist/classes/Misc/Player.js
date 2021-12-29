export class Player {
    constructor(ns) {
    }
    /*
     public getAugmentations(ns: NS): Augmentation[] {

     }

     public hasAugmentation(ns: NS, augmentation: Augmentation): boolean {

     }
     */
    static getPlayer(ns) {
        return ns.getPlayer();
    }
}
