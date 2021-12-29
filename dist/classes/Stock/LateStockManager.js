/*
 CREDITS: This script was heavily influenced by the amazing work of @Insight.
 */
import * as LogAPI from '/src/api/LogAPI.js';
import BaseStockManager from '/src/classes/Stock/BaseStockManager.js';
const BUY_RETURN_THRESHOLD = 0.0001;
const SELL_RETURN_THRESHOLD = 0;
export default class LateStockManager extends BaseStockManager {
    has4s = true;
    async initialize(ns) {
        await super.initialize(ns);
    }
    async start(ns) {
        await super.start(ns);
        LogAPI.printTerminal(ns, `Starting the LateStockManager`);
    }
    async destroy(ns) {
        await super.destroy(ns);
        LogAPI.printTerminal(ns, `Stopping the LateStockManager`);
    }
    async managingLoop(ns) {
        await super.managingLoop(ns);
        // TODO: Any specific things
    }
    preDetectPossibleInversion(ns, stock) {
        const probability = ns.stock.getForecast(stock.symbol);
        return BaseStockManager.detectInversion(probability, stock.stockForecastInformation.probability || probability); // TODO: We should not refer back to the base stock manager
    }
    verifyStockInversion(ns) {
        return this.stockStorage.cycleTick === 0;
    }
    calculateStockForecastInformation(ns, stock) {
        const volatility = ns.stock.getVolatility(stock.symbol);
        const probability = ns.stock.getForecast(stock.symbol);
        // TODO: Read these values from files if we have them, otherwise use a runner
        return {
            volatility,
            probability,
            tools: {
                lastTickProbability: stock.stockForecastInformation?.probability || 0,
                lastInversion: stock.stockForecastInformation?.tools?.lastInversion || 0,
            },
        };
    }
    getSellThreshold() {
        return SELL_RETURN_THRESHOLD;
    }
}
