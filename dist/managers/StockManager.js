/*
 CREDITS: This script was heavily influenced by the amazing work of @Insight.

 NOTE: This script forms the main entry point for the @EarlyStockManager and @LateStockManager classes
 */
import * as LogAPI from '/src/api/LogAPI.js';
import EarlyStockManager from '/src/classes/Stock/EarlyStockManager.js';
import LateStockManager from '/src/classes/Stock/LateStockManager.js';
import * as PlayerUtils from '/src/util/PlayerUtils.js';
const LOOP_DELAY = 1000;
async function startStockManager(ns, StockManagerClass, stockStorage) {
    const instance = new StockManagerClass();
    // TODO: Read the passed flags and apply them in the initialize call
    await instance.initialize(ns);
    if (stockStorage)
        instance.setStockStorage(stockStorage);
    await instance.start(ns);
    return instance;
}
async function stopStockManager(ns, instance) {
    await instance.destroy(ns);
}
export async function main(ns) {
    if (ns.getHostname() !== 'home') {
        throw new Error('Run the script from home');
    }
    let player = PlayerUtils.getPlayer(ns);
    if (!player.hasWseAccount || !player.hasTixApiAccess) {
        throw new Error('Cannot run a StockManager without WSE access');
    }
    let instance = await startStockManager(ns, (player.has4SDataTixApi) ? LateStockManager : EarlyStockManager);
    while (true) {
        player = PlayerUtils.getPlayer(ns);
        if (player.has4SDataTixApi && instance instanceof EarlyStockManager) {
            const stockStorage = instance.getStockStorage();
            await stopStockManager(ns, instance);
            instance = await startStockManager(ns, LateStockManager, stockStorage);
            LogAPI.printLog(ns, `Restarting the StockManager.`);
        }
        await instance.managingLoop(ns);
        await ns.asleep(LOOP_DELAY);
    }
}
