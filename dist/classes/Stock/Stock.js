import { StockPosition } from '/src/classes/Stock/StockInterfaces.js';
import * as LogAPI from '/src/api/LogAPI.js';
import { LogType } from '/src/api/LogAPI.js';
const STOCK_COMMISSION = 100000;
export default class Stock {
    constructor(ns, symbol) {
        this.symbol = symbol;
        this.update(ns);
        this.position = this.stockInformation.probability >= 0 ? StockPosition.LONG : StockPosition.SHORT;
    }
    static getStocks(ns) {
        const symbols = ns.getStockSymbols();
        return symbols.map((symbol) => new Stock(ns, symbol));
    }
    hasShares(ns) {
        return this.stockInformation.ownedShort + this.stockInformation.ownedLong > 0;
    }
    hasMaxShares(ns) {
        return this.stockInformation.ownedShort + this.stockInformation.ownedLong === this.stockInformation.maxShares;
    }
    getStockCorpus(ns) {
        return this.stockInformation.ownedShort * this.stockInformation.averageShortPrice + this.stockInformation.ownedLong * this.stockInformation.averageLongPrice;
    }
    buyShorts(ns, numShares) {
        // TODO: Check whether we can buy that many shares
        const value = ns.shortStock(this.symbol, numShares);
        LogAPI.log(ns, `Bought ${numShares} shorts for ${ns.nFormat(value, '$0.000a')}. Invested: ${ns.nFormat((value * numShares), '$0.000a')}`, LogType.STOCK);
        this.update(ns);
    }
    buyLongs(ns, numShares) {
        // TODO: Check whether we can buy that many shares
        const value = ns.buyStock(this.symbol, numShares);
        LogAPI.log(ns, `Bought ${numShares} longs for ${ns.nFormat(value, '$0.000a')}. Invested: ${ns.nFormat((value * numShares), '$0.000a')}`, LogType.STOCK);
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
        const value = ns.sellShort(this.symbol, this.stockInformation.ownedShort);
        const profit = this.stockInformation.ownedShort * (this.stockInformation.averageShortPrice - value) - 2 * STOCK_COMMISSION;
        if (value) {
            LogAPI.log(ns, `Sold ${this.stockInformation.ownedShort} shorts for ${ns.nFormat(value, '$0.000a')}. Profit: ${ns.nFormat(profit, '$0.000a')}`, LogType.STOCK);
            this.update(ns);
        }
    }
    sellLongs(ns) {
        if (this.stockInformation.ownedLong <= 0)
            throw new Error(`No owned long shares for ${this.symbol}`);
        const value = ns.sellStock(this.symbol, this.stockInformation.ownedLong);
        const profit = this.stockInformation.ownedLong * (value - this.stockInformation.averageLongPrice) - 2 * STOCK_COMMISSION;
        if (value) {
            LogAPI.log(ns, `Sold ${this.stockInformation.ownedLong} longs for ${ns.nFormat(value, '$0.000a')}. Profit: ${ns.nFormat(profit, '$0.000a')}`, LogType.STOCK);
            this.update(ns);
        }
    }
    // TODO: Keep the last moment of update to make sure that we update in time
    update(ns) {
        const volatility = ns.getStockVolatility(this.symbol);
        const probability = ns.getStockForecast(this.symbol) - 0.5;
        const [ownedLong, averageLongPrice, ownedShort, averageShortPrice] = ns.getStockPosition(this.symbol);
        this.stockInformation = {
            ownedLong,
            ownedShort,
            averageLongPrice,
            averageShortPrice,
            volatility,
            probability,
            maxShares: ns.getStockMaxShares(this.symbol),
            askPrice: ns.getStockAskPrice(this.symbol),
            bidPrice: ns.getStockBidPrice(this.symbol),
            expectedReturn: Math.abs(volatility * probability),
        };
    }
}
