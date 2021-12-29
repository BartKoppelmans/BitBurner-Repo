import { MAX_PRICE_HISTORY_LENGTH, } from '/src/managers/StockManager.js';
export const STOCK_COMMISSION = 100000;
export default class Stock {
    symbol;
    stockInformation;
    stockForecastInformation; // Custom forecast in case we don't have the API
    priceHistory = [];
    constructor(ns, symbol) {
        this.symbol = symbol;
    }
    static isManualStockForecastInformation(stockForecastInformation) {
        return stockForecastInformation.probabilitySigma !== undefined;
    }
    updateStockInformation(stockInformation) {
        this.stockInformation = stockInformation;
    }
    updateForecastInformation(stockForecastInformation) {
        this.stockForecastInformation = stockForecastInformation;
    }
    getExpectedReturn() {
        const normalizedProbability = (this.stockForecastInformation.probability - 0.5);
        let sigma = 0;
        if (Stock.isManualStockForecastInformation(this.stockForecastInformation)) {
            // To add conservatism to pre-4s estimates, we reduce the probability by 1 standard deviation without
            // crossing the midpoint
            sigma = this.stockForecastInformation.probabilitySigma;
        }
        const conservativeProbability = (normalizedProbability < 0) ?
            Math.min(0, normalizedProbability + sigma) :
            Math.max(0, normalizedProbability - sigma);
        return this.stockForecastInformation.volatility * conservativeProbability;
    }
    addToPriceHistory(price) {
        this.priceHistory.unshift(price);
        if (this.priceHistory.length > MAX_PRICE_HISTORY_LENGTH) {
            this.priceHistory.splice(MAX_PRICE_HISTORY_LENGTH, 1);
        }
    }
    getMoneyInvested() {
        let totalMoneyInvested = 0;
        for (const purchase of this.stockInformation.purchases) {
            totalMoneyInvested += purchase.numShares * purchase.price;
        }
        return totalMoneyInvested;
    }
    getTimeToCoverSpread() {
        return Math.log(this.stockInformation.priceInformation.askPrice / this.stockInformation.priceInformation.bidPrice) / Math.log(1 + Math.abs(this.getExpectedReturn()));
    }
    getBlackoutWindow() {
        return Math.ceil(this.getTimeToCoverSpread());
    }
    getValue() {
        let totalValue = 0;
        for (const purchase of this.stockInformation.purchases) {
            if (purchase.type === 'long') {
                totalValue += purchase.numShares * this.stockInformation.priceInformation.bidPrice;
            }
            else if (purchase.type === 'short') {
                totalValue += purchase.numShares * (2 * purchase.price - this.stockInformation.priceInformation.askPrice);
            }
        }
        return totalValue;
    }
    willIncrease() {
        return this.stockForecastInformation.probability >= 0.5;
    }
    willDecrease() {
        return this.stockForecastInformation.probability < 0.5;
    }
    buyShorts(ns, numShares) {
        // TODO: Check whether we can buy the stock (should already be possible)
        const expectedPrice = this.stockInformation.priceInformation.bidPrice;
        let price = ns.stock.short(this.symbol, numShares); // TODO: Make this into a runner
        if (price === 0)
            throw new Error(`Failed to short the stocks`);
        else if (price !== expectedPrice) {
            // TODO: Log
            // NOTE: This is a known bitburner bug, so patch it internally here
            price = expectedPrice;
        }
        this.stockInformation.sharesShort += numShares;
        return {
            type: 'short',
            ticksHeld: 0,
            numShares,
            price,
        };
    }
    buyLongs(ns, numShares) {
        // TODO: Check whether we can buy the stock (should already be possible)
        const expectedPrice = this.stockInformation.priceInformation.askPrice;
        let price = ns.stock.buy(this.symbol, numShares); // TODO: Make this into a runner
        if (price === 0)
            throw new Error(`Failed to buy the stocks`);
        else if (price !== expectedPrice) {
            // TODO: Log
            // NOTE: This is a known bitburner bug, so patch it internally here
            price = expectedPrice;
        }
        this.stockInformation.sharesShort += numShares;
        return {
            type: 'long',
            ticksHeld: 0,
            numShares,
            price,
        };
    }
    sellAll(ns) {
        if (this.stockInformation.ownedShares === 0) {
            throw new Error(`We didn't have any shares, so something went wrong`);
        }
        if (this.stockInformation.sharesLong > 0) {
            return this.sellLongs(ns);
        }
        else if (this.stockInformation.sharesShort > 0) {
            return this.sellShorts(ns);
        }
        else {
            // We didn't have any shares, so something went wrong
            throw new Error(`We didn't have any shares, so something went wrong`);
        }
    }
    sellShorts(ns) {
        const expectedPrice = this.stockInformation.priceInformation.askPrice;
        const numShares = this.stockInformation.sharesShort;
        let price = ns.stock.sellShort(this.symbol, numShares); // TODO: Make this into a runner
        if (price === 0)
            throw new Error(`Failed to sell the stocks`);
        else if (price !== expectedPrice) {
            // TODO: Log
            // NOTE: This is a known bitburner bug, so patch it internally here
            price = expectedPrice;
        }
        let money = 0;
        let profit = 0;
        for (const purchase of this.stockInformation.purchases) {
            profit += (purchase.numShares * (purchase.price - price)) - 2 * STOCK_COMMISSION;
            money += (price * numShares) - STOCK_COMMISSION;
        }
        this.stockInformation.purchases = [];
        return {
            type: 'short',
            ticksHeld: Math.max(...this.stockInformation.purchases.map((purchase) => purchase.ticksHeld)),
            numShares,
            money,
            profit,
        };
    }
    sellLongs(ns) {
        const expectedPrice = this.stockInformation.priceInformation.bidPrice;
        const numShares = this.stockInformation.sharesLong;
        let price = ns.stock.sell(this.symbol, numShares); // TODO: Make this into a runner
        if (price === 0)
            throw new Error(`Failed to sell the stocks`);
        else if (price !== expectedPrice) {
            // TODO: Log
            // NOTE: This is a known bitburner bug, so patch it internally here
            price = expectedPrice;
        }
        let money = 0;
        let profit = 0;
        for (const purchase of this.stockInformation.purchases) {
            profit += (purchase.numShares * (price - purchase.price)) - 2 * STOCK_COMMISSION;
            money += (price * numShares) - STOCK_COMMISSION;
        }
        this.stockInformation.purchases = [];
        // TODO: Log
        return {
            type: 'long',
            ticksHeld: Math.max(...this.stockInformation.purchases.map((purchase) => purchase.ticksHeld)),
            numShares,
            money,
            profit,
        };
    }
}
