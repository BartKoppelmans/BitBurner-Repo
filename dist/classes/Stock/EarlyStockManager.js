/*
 CREDITS: This script was heavily influenced by the amazing work of @Insight.
 */
import * as LogAPI from '/src/api/LogAPI.js';
import { INVERSION_LAG_TOLERANCE, LONG_TERM_FORECAST_WINDOW_LENGTH, NEAR_TERM_FORECAST_WINDOW_LENGTH, StockManager, } from '/src/managers/StockManager.js';
import { PRICE_HISTORY_THRESHOLD } from '/src/classes/Storage/StockStorage.js';
const BUY_PROBABILITY_THRESHOLD = 0.15;
const BUY_RETURN_THRESHOLD = 0.0015;
const SELL_RETURN_THRESHOLD = 0.0008;
const MINIMUM_HOLD_TIME = 10;
const MINIMUM_BLACKOUT_WINDOW = 10;
export class EarlyStockManager extends StockManager {
    has4s = false;
    async initialize(ns) {
        await super.initialize(ns);
    }
    async start(ns) {
        await super.start(ns);
        LogAPI.printTerminal(ns, `Starting the EarlyStockManager`);
    }
    async destroy(ns) {
        await super.destroy(ns);
        LogAPI.printTerminal(ns, `Stopping the EarlyStockManager`);
    }
    async managingLoop(ns) {
        await super.managingLoop(ns);
        // TODO: Any specific things
    }
    preDetectPossibleInversion(ns, stock) {
        const nearTermForecast = EarlyStockManager.calculateForecast(stock.priceHistory.slice(0, NEAR_TERM_FORECAST_WINDOW_LENGTH));
        const preNearTermForecast = EarlyStockManager.calculateForecast(stock.priceHistory.slice(NEAR_TERM_FORECAST_WINDOW_LENGTH));
        return EarlyStockManager.detectInversion(preNearTermForecast, nearTermForecast);
    }
    verifyStockInversion(ns) {
        return (this.stockStorage.cycleTick > NEAR_TERM_FORECAST_WINDOW_LENGTH / 2 - 1) &&
            (this.stockStorage.cycleTick <= NEAR_TERM_FORECAST_WINDOW_LENGTH + INVERSION_LAG_TOLERANCE);
    }
    shouldBuy(stock) {
        if (!super.shouldBuy(stock))
            return false;
        // Some extra checks in case we don't have the 4s
        if (Math.max(MINIMUM_HOLD_TIME, MINIMUM_BLACKOUT_WINDOW) >= this.stockStorage.getTicksUntilMarketCycle())
            return false;
        if (stock.stockForecastInformation.tools.lastInversion < PRICE_HISTORY_THRESHOLD)
            return false;
        // TODO: PANIC, WE ARE USING AN IMPORTED CONST
        if (Math.abs(stock.stockForecastInformation.probability - 0.5) < BUY_PROBABILITY_THRESHOLD)
            return false;
        return true;
    }
    calculateStockForecastInformation(ns, stock) {
        // the largest observed % movement in a single tick
        const volatility = stock.priceHistory.reduce((max, price, idx) => Math.max(max, idx === 0 ? 0 : Math.abs(stock.priceHistory[idx - 1] - price) / price), 0);
        const probabilityWindowLength = Math.min(LONG_TERM_FORECAST_WINDOW_LENGTH, stock.stockForecastInformation.tools.lastInversion);
        const nearTermForecast = EarlyStockManager.calculateForecast(stock.priceHistory.slice(0, NEAR_TERM_FORECAST_WINDOW_LENGTH));
        const longTermForecast = EarlyStockManager.calculateForecast(stock.priceHistory.slice(0, probabilityWindowLength));
        return {
            volatility,
            probability: longTermForecast,
            probabilitySigma: Math.sqrt((longTermForecast * (1 - longTermForecast)) / probabilityWindowLength),
            tools: {
                lastTickProbability: stock.stockForecastInformation.probability,
                nearTermForecast,
                longTermForecast,
                lastInversion: stock.stockForecastInformation.tools.lastInversion,
            },
        };
    }
    shouldSell(stock) {
        return stock.stockInformation.purchases.some((purchase) => purchase.ticksHeld >= MINIMUM_HOLD_TIME);
    }
    getSellThreshold() {
        return SELL_RETURN_THRESHOLD;
    }
}
