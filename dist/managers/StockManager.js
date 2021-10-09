import { hasManagerKillRequest } from '/src/api/ControlFlowAPI.js';
import * as LogAPI from '/src/api/LogAPI.js';
import { LogType } from '/src/api/LogAPI.js';
import * as Utils from '/src/util/Utils.js';
import * as PlayerUtils from '/src/util/PlayerUtils.js';
import { CONSTANT } from '/src/lib/constants.js';
import Stock from '/src/classes/Stock/Stock.js';
import { StockPosition } from '/src/classes/Stock/StockInterfaces.js';
const LOOP_DELAY = 1000;
const STOCK_ALLOWANCE = 0.05;
const STOCK_COMMISSION = 100000;
const MINIMUM_MONEY_TO_INVEST = 10 * STOCK_COMMISSION;
const EXPECTED_RETURN_THRESHOLD = 0.0002; // Buy anything forecasted to earn better than a 0.02% return
class StockManager {
    constructor() {
        this.stocks = [];
        this.startingCorpus = 0;
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
            if (stock.stockInformation.expectedReturn <= EXPECTED_RETURN_THRESHOLD)
                continue;
            const remainingShares = stock.stockInformation.maxShares - stock.stockInformation.ownedLong - stock.stockInformation.ownedShort;
            if (stock.position === StockPosition.LONG) {
                const purchasableShares = Math.max(0, Math.min(remainingShares, Math.floor(budget / stock.stockInformation.askPrice)));
                if (purchasableShares) {
                    stock.buyLongs(ns, purchasableShares);
                }
            }
            else {
                if (!StockManager.hasShortAccess(ns))
                    continue;
                const purchasableShares = Math.max(0, Math.min(remainingShares, Math.floor(budget / stock.stockInformation.bidPrice)));
                if (purchasableShares) {
                    stock.buyShorts(ns, purchasableShares);
                }
            }
        }
    }
    static sellUnderperforming(ns, stocks) {
        const soldStocks = [];
        for (const stock of stocks) {
            if (stock.stockInformation.ownedShort) {
                const potentialProfit = stock.stockInformation.ownedShort * (stock.stockInformation.averageShortPrice - stock.stockInformation.askPrice);
                if (potentialProfit > 2 * STOCK_COMMISSION) {
                    stock.sellShorts(ns);
                    soldStocks.push(stock);
                }
            }
            if (stock.stockInformation.ownedLong) {
                const potentialProfit = stock.stockInformation.ownedLong * (stock.stockInformation.bidPrice - stock.stockInformation.averageLongPrice);
                if (potentialProfit > 2 * STOCK_COMMISSION) {
                    stock.sellLongs(ns);
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
    }
    static sellIncorrectPositions(ns, stocks) {
        const soldStocks = [];
        for (const stock of stocks) {
            if (stock.position === StockPosition.LONG && stock.stockInformation.ownedShort) {
                stock.sellShorts(ns);
                soldStocks.push(stock);
            }
            if (stock.position === StockPosition.SHORT && stock.stockInformation.ownedLong) {
                stock.sellLongs(ns);
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
    }
    async initialize(ns) {
        Utils.disableLogging(ns);
        this.stocks = Stock.getStocks(ns);
        this.startingCorpus = this.stocks.reduce((total, stock) => total + stock.getStockCorpus(), 0);
    }
    async start(ns) {
        LogAPI.debug(ns, `Starting the StockManager`);
        LogAPI.log(ns, `Starting corpus value of ${ns.nFormat(this.startingCorpus, '$0.000a')}`, LogType.STOCK);
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
        LogAPI.debug(ns, `Stopping the StockManager`);
    }
    async managingLoop(ns) {
        // let corpus: number = this.stocks.reduce((total, stock) => total + stock.getStockCorpus(ns), 0)
        // LogAPI.log(ns, `Total corpus value of ${ns.nFormat(corpus, '$0.000a')} before transactions`, LogType.STOCK)
        this.stocks.forEach((stock) => stock.update(ns));
        this.stocks.sort((a, b) => {
            if (b.stockInformation.expectedReturn === a.stockInformation.expectedReturn) {
                return Math.abs(b.stockInformation.probability) - Math.abs(a.stockInformation.probability);
            }
            return b.stockInformation.expectedReturn - a.stockInformation.expectedReturn;
        });
        const ownedStocks = this.stocks.filter((stock) => stock.hasShares());
        // We update the ownedStocks in-place in the coming function calls
        StockManager.sellUnderperforming(ns, ownedStocks);
        if (StockManager.hasShortAccess(ns)) {
            StockManager.sellIncorrectPositions(ns, ownedStocks);
        }
        StockManager.buyShares(ns, this.stocks);
        // corpus = this.stocks.reduce((total, stock) => total + stock.getStockCorpus(ns), 0)
        // LogAPI.log(ns, `Total corpus value of ${ns.nFormat(corpus, '$0.000a')} after transactions`, LogType.STOCK)
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
