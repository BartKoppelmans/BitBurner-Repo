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
        const symbols = ns.stock.getStockSymbols();
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
        const value = ns.stock.shortStock(this.symbol, numShares);
        LogAPI.printLog(ns, `Bought ${numShares} shorts for ${ns.nFormat(value, '$0.000a')}. Invested: ${ns.nFormat((value * numShares), '$0.000a')}`);
        this.update(ns);
    }
    buyLongs(ns, numShares) {
        // TODO: Check whether we can buy that many shares
        const value = ns.stock.buyStock(this.symbol, numShares);
        LogAPI.printLog(ns, `Bought ${numShares} longs for ${ns.nFormat(value, '$0.000a')}. Invested: ${ns.nFormat((value * numShares), '$0.000a')}`);
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
            LogAPI.printLog(ns, `Sold ${this.stockInformation.ownedShort} shorts for ${ns.nFormat(value, '$0.000a')}. Profit: ${ns.nFormat(profit, '$0.000a')}`);
            this.update(ns);
            return profit;
        }
        return 0;
    }
    sellLongs(ns) {
        if (this.stockInformation.ownedLong <= 0)
            throw new Error(`No owned long shares for ${this.symbol}`);
        const value = ns.stock.sellStock(this.symbol, this.stockInformation.ownedLong);
        if (value) {
            const profit = this.stockInformation.ownedLong * (value - this.stockInformation.averageLongPrice) - 2 * STOCK_COMMISSION;
            LogAPI.printLog(ns, `Sold ${this.stockInformation.ownedLong} longs for ${ns.nFormat(value, '$0.000a')}. Profit: ${ns.nFormat(profit, '$0.000a')}`);
            this.update(ns);
            return profit;
        }
        return 0;
    }
    // TODO: Keep the last moment of update to make sure that we update in time
    update(ns) {
        const volatility = ns.stock.getStockVolatility(this.symbol);
        const probability = 2 * (ns.stock.getStockForecast(this.symbol) - 0.5);
        const [ownedLong, averageLongPrice, ownedShort, averageShortPrice] = ns.stock.getStockPosition(this.symbol);
        this.stockInformation = {
            ownedLong,
            ownedShort,
            averageLongPrice,
            averageShortPrice,
            volatility,
            probability,
            price: ns.stock.getStockPrice(this.symbol),
            maxShares: ns.stock.getStockMaxShares(this.symbol),
            askPrice: ns.stock.getStockAskPrice(this.symbol),
            bidPrice: ns.stock.getStockBidPrice(this.symbol),
            expectedReturn: volatility * probability / 2,
        };
    }
}
