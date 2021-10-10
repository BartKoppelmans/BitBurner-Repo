import { hasManagerKillRequest } from '/src/api/ControlFlowAPI.js';
import * as LogAPI from '/src/api/LogAPI.js';
import * as Utils from '/src/util/Utils.js';
import * as PlayerUtils from '/src/util/PlayerUtils.js';
import { CONSTANT } from '/src/lib/constants.js';
import Stock from '/src/classes/Stock/Stock.js';
import { StockPosition } from '/src/classes/Stock/StockInterfaces.js';
const LOOP_DELAY = 1000;
const STOCK_ALLOWANCE = 0.05;
const STOCK_COMMISSION = 100000;
const MINIMUM_MONEY_TO_INVEST = 10 * STOCK_COMMISSION;
const EXPECTED_RETURN_BUY_THRESHOLD = 0.0002; // Buy anything forecasted to earn better than a 0.02%
// return
const EXPECTED_RETURN_SELL_THRESHOLD = 0.0001; // Buy anything forecasted to earn better than a 0.02%
// return
class StockManager {
    constructor() {
        this.stocks = [];
        this.startingCorpus = 0;
        this.lastCorpus = 0;
        this.runningProfit = 0;
        this.lastRunningProfit = 0;
    }
    static getBudget(ns, stocks) {
        const corpus = stocks.reduce((total, stock) => total + stock.getStockCorpus(), 0);
        const totalBudget = STOCK_ALLOWANCE * PlayerUtils.getMoney(ns);
        return totalBudget - corpus;
    }
    static hasShortAccess(ns) {
        return ns.getPlayer().bitNodeN === 8 ||
            ns.getOwnedSourceFiles().includes({ n: 8, lvl: 2 }) ||
            ns.getOwnedSourceFiles().includes({ n: 8, lvl: 3 });
    }
    static buyShares(ns, stocks) {
        for (const stock of stocks) {
            const budget = StockManager.getBudget(ns, stocks);
            // Just stop if we can't buy any stocks
            if (budget < MINIMUM_MONEY_TO_INVEST)
                break;
            // Skip over this stock if we can't buy any more shares
            if (stock.hasMaxShares())
                continue;
            if (stock.stockInformation.expectedReturn <= EXPECTED_RETURN_BUY_THRESHOLD)
                continue;
            const remainingShares = stock.stockInformation.maxShares - stock.stockInformation.ownedLong - stock.stockInformation.ownedShort;
            // TODO: Refactor this below
            if (!StockManager.hasShortAccess(ns)) {
                const purchasableShares = Math.max(0, Math.min(remainingShares, Math.floor(budget / stock.stockInformation.askPrice)));
                if (purchasableShares) {
                    if (purchasableShares * stock.stockInformation.expectedReturn * stock.stockInformation.price < 2 * STOCK_COMMISSION)
                        continue;
                    stock.buyLongs(ns, purchasableShares);
                }
            }
            else {
                if (stock.position === StockPosition.LONG) {
                    const purchasableShares = Math.max(0, Math.min(remainingShares, Math.floor(budget / stock.stockInformation.askPrice)));
                    if (purchasableShares) {
                        stock.buyLongs(ns, purchasableShares);
                    }
                }
                else {
                    const purchasableShares = Math.max(0, Math.min(remainingShares, Math.floor(budget / stock.stockInformation.bidPrice)));
                    if (purchasableShares) {
                        stock.buyShorts(ns, purchasableShares);
                    }
                }
            }
        }
    }
    static sellUnderperforming(ns, stocks) {
        const soldStocks = [];
        let totalProfit = 0;
        for (const stock of stocks) {
            if (stock.stockInformation.ownedShort) {
                if (stock.stockInformation.expectedReturn > EXPECTED_RETURN_SELL_THRESHOLD)
                    continue;
                const potentialProfit = stock.stockInformation.ownedShort * (stock.stockInformation.averageShortPrice - stock.stockInformation.askPrice);
                // Only sell if we would make a profit
                if (potentialProfit > 2 * STOCK_COMMISSION) {
                    totalProfit += stock.sellShorts(ns);
                    soldStocks.push(stock);
                }
            }
            if (stock.stockInformation.ownedLong) {
                if (stock.stockInformation.expectedReturn > EXPECTED_RETURN_SELL_THRESHOLD)
                    continue;
                const potentialProfit = stock.stockInformation.ownedLong * (stock.stockInformation.bidPrice - stock.stockInformation.averageLongPrice);
                // Only sell if we would make a profit
                if (potentialProfit > 2 * STOCK_COMMISSION) {
                    totalProfit += stock.sellLongs(ns);
                    soldStocks.push(stock);
                }
            }
        }
        soldStocks.forEach((soldStock) => {
            const index = stocks.findIndex((stock) => stock.symbol === soldStock.symbol);
            if (index === -1)
                return; // It was already removed
            else
                stocks.splice(index, 1);
        });
        return totalProfit;
    }
    static sellIncorrectPositions(ns, stocks) {
        const soldStocks = [];
        let totalProfit = 0;
        for (const stock of stocks) {
            if (stock.position === StockPosition.LONG && stock.stockInformation.ownedShort) {
                totalProfit += stock.sellShorts(ns);
                soldStocks.push(stock);
            }
            if (stock.position === StockPosition.SHORT && stock.stockInformation.ownedLong) {
                totalProfit += stock.sellLongs(ns);
                soldStocks.push(stock);
            }
        }
        soldStocks.forEach((soldStock) => {
            const index = stocks.findIndex((stock) => stock.symbol === soldStock.symbol);
            if (index === -1)
                return; // It was already removed
            else
                stocks.splice(index, 1);
        });
        return totalProfit;
    }
    static updateStocks(ns, stocks) {
        stocks.forEach((stock) => stock.update(ns));
    }
    async initialize(ns) {
        Utils.disableLogging(ns);
        this.stocks = Stock.getStocks(ns);
        this.startingCorpus = this.stocks.reduce((total, stock) => total + stock.getStockCorpus(), 0);
    }
    async start(ns) {
        LogAPI.printTerminal(ns, `Starting the StockManager`);
        LogAPI.printLog(ns, `Starting corpus value of ${ns.nFormat(this.startingCorpus, '$0.000a')}`);
        this.managingLoopTimeout = setTimeout(this.managingLoop.bind(this, ns), LOOP_DELAY);
    }
    async destroy(ns) {
        if (this.managingLoopTimeout)
            clearTimeout(this.managingLoopTimeout);
        // TODO: Sell all stocks
        this.stocks.forEach((stock) => {
            stock.update(ns);
            stock.sellAll(ns);
        });
        LogAPI.printTerminal(ns, `Stopping the StockManager`);
    }
    async managingLoop(ns) {
        StockManager.updateStocks(ns, this.stocks);
        this.stocks.sort((a, b) => {
            if (b.stockInformation.expectedReturn === a.stockInformation.expectedReturn) {
                return Math.abs(b.stockInformation.probability) - Math.abs(a.stockInformation.probability);
            }
            return b.stockInformation.expectedReturn - a.stockInformation.expectedReturn;
        });
        const ownedStocks = this.stocks.filter((stock) => stock.hasShares());
        const corpus = ownedStocks.reduce((total, stock) => total + stock.getStockCorpus(), 0);
        if (corpus !== this.lastCorpus) {
            LogAPI.printLog(ns, `Holding ${ownedStocks.length} stocks (of ${this.stocks.length} total stocks.\nTotal corpus value of ${ns.nFormat(corpus, '$0.000a')}`);
        }
        // We update the ownedStocks in-place in the coming function calls
        this.runningProfit += StockManager.sellUnderperforming(ns, ownedStocks);
        if (StockManager.hasShortAccess(ns)) {
            this.runningProfit += StockManager.sellIncorrectPositions(ns, ownedStocks);
        }
        StockManager.buyShares(ns, this.stocks);
        if (this.runningProfit !== this.lastRunningProfit) {
            this.lastRunningProfit = this.runningProfit;
            LogAPI.printLog(ns, this.runningProfit > 0 ? `Total profit so far: ${ns.nFormat(this.runningProfit, '$0.000a')}` : `Total loss so far: ${ns.nFormat(-this.runningProfit, '$0.000a')}}`);
        }
        this.managingLoopTimeout = setTimeout(this.managingLoop.bind(this, ns), LOOP_DELAY);
    }
}
export async function main(ns) {
    if (ns.getHostname() !== 'home') {
        throw new Error('Run the script from home');
    }
    const instance = new StockManager();
    await instance.initialize(ns);
    await instance.start(ns);
    while (!hasManagerKillRequest(ns)) {
        await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL);
    }
    await instance.destroy(ns);
}
