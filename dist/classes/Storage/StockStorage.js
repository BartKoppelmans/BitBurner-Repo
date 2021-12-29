import { CONSTANT } from '/src/lib/constants.js';
import * as LogAPI from '/src/api/LogAPI.js';
import Stock from '/src/classes/Stock/Stock.js';
import { MAX_PRICE_HISTORY_LENGTH, NEAR_TERM_FORECAST_WINDOW_LENGTH, } from '/src/managers/StockManager.js';
const LAST_UPDATED_THRESHOLD = 2500;
const MARKET_CYCLE_LENGTH = 75;
export const PRICE_HISTORY_THRESHOLD = 21;
const INVERSION_AGREEMENT_THRESHOLD_DEFAULT = 6;
const INVERSION_AGREEMENT_THRESHOLD_CAP = 14;
export class StockStorage {
    lastUpdated = CONSTANT.EPOCH_DATE;
    marketCycleDetected = false;
    cycleTick = 0;
    totalTicks = 0;
    stocks = [];
    inversionAgreementThreshold = INVERSION_AGREEMENT_THRESHOLD_DEFAULT;
    constructor(ns, stockMap) {
        if (stockMap && Date.now() - stockMap.lastUpdated.getTime() < LAST_UPDATED_THRESHOLD) {
            this.stocks = stockMap.stocks;
            this.lastUpdated = stockMap.lastUpdated;
            this.cycleTick = stockMap.cycleTick;
            this.marketCycleDetected = stockMap.marketCycleDetected;
        }
        else
            this.initialize(ns);
    }
    getStockMap() {
        return {
            stocks: this.stocks,
            lastUpdated: this.lastUpdated,
            cycleTick: this.cycleTick,
            marketCycleDetected: this.marketCycleDetected,
        };
    }
    getOwnedStocks() {
        return this.stocks.filter((stock) => stock.stockInformation.ownedShares > 0);
    }
    detectMarketCycle(ns, stockInversionDict, has4s) {
        const historyLength = Math.min(this.totalTicks, MAX_PRICE_HISTORY_LENGTH);
        const numInversionsDetected = Object.keys(stockInversionDict)
            .reduce((total, key) => total + +stockInversionDict[key], 0);
        if (numInversionsDetected > 0) {
            // We detected the market cycle!
            if (numInversionsDetected >= this.inversionAgreementThreshold && (has4s || historyLength >= PRICE_HISTORY_THRESHOLD)) {
                const predictedCycleTick = has4s ? 0 : NEAR_TERM_FORECAST_WINDOW_LENGTH;
                LogAPI.printLog(ns, `Threshold for changing predicted market cycle met (${numInversionsDetected} >= ${this.inversionAgreementThreshold}).\nChanging current market tick from ${this.cycleTick} to ${predictedCycleTick}`);
                this.marketCycleDetected = true;
                this.cycleTick = predictedCycleTick;
                this.inversionAgreementThreshold = Math.max(INVERSION_AGREEMENT_THRESHOLD_CAP, numInversionsDetected);
            }
        }
    }
    // This is somehow not correct I think, but I don't understand the original code
    getEstimatedTick() {
        let tickEstimate = 0;
        if (!this.marketCycleDetected) {
            tickEstimate = 5;
        }
        else if (this.inversionAgreementThreshold <= 8) {
            tickEstimate = 15;
        }
        else if (this.inversionAgreementThreshold <= 10) {
            tickEstimate = 30;
        }
        else
            tickEstimate = MARKET_CYCLE_LENGTH;
        return MARKET_CYCLE_LENGTH - Math.min(this.cycleTick, tickEstimate);
    }
    getTicksUntilMarketCycle() {
        return MARKET_CYCLE_LENGTH - this.getEstimatedTick();
    }
    hasEnoughHistory() {
        return this.getHistoryLength() >= PRICE_HISTORY_THRESHOLD;
    }
    getHistoryLength() {
        return Math.min(this.totalTicks, MAX_PRICE_HISTORY_LENGTH);
    }
    getCorpus() {
        let corpus = 0;
        for (const stock of this.stocks) {
            corpus += stock.getMoneyInvested();
        }
        return corpus;
    }
    getTotalStockValue() {
        let totalStockValue = 0;
        for (const stock of this.stocks) {
            totalStockValue += stock.getValue();
        }
        return totalStockValue;
    }
    tick() {
        this.cycleTick = (this.cycleTick + 1) % MARKET_CYCLE_LENGTH;
        this.totalTicks++;
        this.stocks.forEach((stock) => stock.addToPriceHistory(stock.stockInformation.priceInformation.price));
        // Update the ticks held for our purchases
        for (const stock of this.stocks) {
            stock.stockInformation.purchases.forEach((purchase, index) => {
                this[index] = {
                    ...purchase,
                    ticksHeld: purchase.ticksHeld + 1,
                };
            }, this);
        }
        // TODO: Verify that all our stocks are still valid, this means:
        //       - That we only have one type of share, amongst possible other things
        this.lastUpdated = new Date();
    }
    updateStockInformation(dict) {
        Object.entries(dict).forEach(([key, value]) => {
            const stock = this.stocks.find((s) => s.symbol === key);
            if (!stock)
                throw new Error(`We don't have the stock`);
            stock.updateStockInformation(value);
        });
        this.lastUpdated = new Date();
    }
    updateStockForecast(dict) {
        Object.entries(dict).forEach(([key, value]) => {
            const stock = this.stocks.find((s) => s.symbol === key);
            if (!stock)
                throw new Error(`We don't have the stock`);
            stock.updateForecastInformation(value);
        });
        this.lastUpdated = new Date();
    }
    initialize(ns) {
        // TODO: Use a runner for this
        const symbols = ns.stock.getSymbols();
        this.stocks = symbols.map((symbol) => new Stock(ns, symbol));
        // TODO:    We probably need to do more, but meh for now
        //          We'll do that when we go to the testing era
    }
}
