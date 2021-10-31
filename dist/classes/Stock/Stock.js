import { StockPosition } from '/src/classes/Stock/StockInterfaces.js';
import * as LogAPI from '/src/api/LogAPI.js';
const STOCK_COMMISSION = 100000;
export default class Stock {
    symbol;
    position;
    stockInformation;
    constructor(ns, symbol) {
        this.symbol = symbol;
        this.update(ns);
        this.position = this.stockInformation.probability >= 0 ? StockPosition.LONG : StockPosition.SHORT;
    }
    static getStocks(ns) {
        const symbols = ns.stock.getSymbols();
        return symbols.map((symbol) => new Stock(ns, symbol));
    }
    hasShares() {
        return this.stockInformation.ownedShort + this.stockInformation.ownedLong > 0;
    }
    hasMaxShares() {
        return this.stockInformation.ownedShort + this.stockInformation.ownedLong === this.stockInformation.maxShares;
    }
    getStockCorpus() {
        return this.stockInformation.ownedShort * this.stockInformation.averageShortPrice + this.stockInformation.ownedLong * this.stockInformation.averageLongPrice;
    }
    buyShorts(ns, numShares) {
        // TODO: Check whether we can buy that many shares
        const costs = ns.stock.short(this.symbol, numShares);
        if (costs > this.stockInformation.price) {
            LogAPI.printLog(ns, `WARNING: Intended to buy ${this.symbol} at ${ns.nFormat(this.stockInformation.price, '$0.000a')} but price was ${ns.nFormat(costs, '$0.000a')}`);
        }
        LogAPI.printLog(ns, `Bought ${numShares} shorts of ${this.symbol} for ${ns.nFormat(costs, '$0.000a')}. Invested: ${ns.nFormat((costs * numShares), '$0.000a')}`);
        this.update(ns);
    }
    buyLongs(ns, numShares) {
        // TODO: Check whether we can buy that many shares
        const costs = ns.stock.buy(this.symbol, numShares);
        if (costs > this.stockInformation.price) {
            LogAPI.printLog(ns, `WARNING: Intended to buy ${this.symbol} at ${ns.nFormat(this.stockInformation.price, '$0.000a')} but price was ${ns.nFormat(costs, '$0.000a')}`);
        }
        LogAPI.printLog(ns, `Bought ${numShares} longs of ${this.symbol} for ${ns.nFormat(costs, '$0.000a')}. Invested: ${ns.nFormat((costs * numShares), '$0.000a')}`);
        this.update(ns);
    }
    sellAll(ns) {
        if (this.stockInformation.ownedShort > 0)
            this.sellShorts(ns);
        if (this.stockInformation.ownedLong > 0)
            this.sellLongs(ns);
    }
    sellShorts(ns) {
        if (this.stockInformation.ownedShort <= 0)
            throw new Error(`No owned short shares for ${this.symbol}`);
        const value = ns.stock.sellShort(this.symbol, this.stockInformation.ownedShort);
        if (value) {
            const profit = this.stockInformation.ownedShort * (this.stockInformation.averageShortPrice - value) - 2 * STOCK_COMMISSION;
            LogAPI.printLog(ns, `Sold ${this.stockInformation.ownedShort} shorts of ${this.symbol} for ${ns.nFormat(value, '$0.000a')}. Profit: ${ns.nFormat(profit, '$0.000a')}`);
            this.update(ns);
            return profit;
        }
        return 0;
    }
    sellLongs(ns) {
        if (this.stockInformation.ownedLong <= 0)
            throw new Error(`No owned long shares for ${this.symbol}`);
        const value = ns.stock.sell(this.symbol, this.stockInformation.ownedLong);
        if (value) {
            const profit = this.stockInformation.ownedLong * (value - this.stockInformation.averageLongPrice) - 2 * STOCK_COMMISSION;
            LogAPI.printLog(ns, `Sold ${this.stockInformation.ownedLong} longs of ${this.symbol} for ${ns.nFormat(value, '$0.000a')}. Profit: ${ns.nFormat(profit, '$0.000a')}`);
            this.update(ns);
            return profit;
        }
        return 0;
    }
    // TODO: Keep the last moment of update to make sure that we update in time
    update(ns) {
        const volatility = ns.stock.getVolatility(this.symbol);
        const probability = 2 * (ns.stock.getForecast(this.symbol) - 0.5);
        const [ownedLong, averageLongPrice, ownedShort, averageShortPrice] = ns.stock.getPosition(this.symbol);
        this.stockInformation = {
            ownedLong,
            ownedShort,
            averageLongPrice,
            averageShortPrice,
            volatility,
            probability,
            price: ns.stock.getPrice(this.symbol),
            maxShares: ns.stock.getMaxShares(this.symbol),
            askPrice: ns.stock.getAskPrice(this.symbol),
            bidPrice: ns.stock.getBidPrice(this.symbol),
            expectedReturn: volatility * probability / 2,
        };
    }
}
