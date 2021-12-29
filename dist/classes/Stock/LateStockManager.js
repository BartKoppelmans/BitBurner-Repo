/*
 CREDITS: This script was heavily influenced by the amazing work of @Insight.
 */
import * as LogAPI from '/src/api/LogAPI.js';
import { StockManager } from '/src/managers/StockManager.js';
const BUY_RETURN_THRESHOLD = 0.0001;
const SELL_RETURN_THRESHOLD = 0;
export class LateStockManager extends StockManager {
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
        return StockManager.detectInversion(probability, stock.stockForecastInformation.probability || probability);
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
                lastTickProbability: stock.stockForecastInformation.probability,
                lastInversion: stock.stockForecastInformation.tools.lastInversion,
            },
        };
    }
    getSellThreshold() {
        return SELL_RETURN_THRESHOLD;
    }
}
