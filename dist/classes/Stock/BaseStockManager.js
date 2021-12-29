/*
 CREDITS: This script was heavily influenced by the amazing work of @Insight.

 NOTE: This script forms the main entry point for the @EarlyStockManager and @LateStockManager classes
 */
import * as LogAPI from '/src/api/LogAPI.js';
import * as Utils from '/src/util/Utils.js';
import * as PlayerUtils from '/src/util/PlayerUtils.js';
import StockStorage from '/src/classes/Storage/StockStorage.js';
import { STOCK_CONSTANT } from '/src/classes/Stock/StockConstants.js';
// TODO: Manage the exports better, because this is just shit
const INVERSION_DETECTION_TOLERANCE = 0.10;
const DIVERSIFICATION_FACTOR = 0.33;
const FOUR_SIGMA_MARKET_DATA_COST = 5000000000;
const FOUR_SIGMA_MARKET_DATA_API_COST = 25000000000;
const WORKING_ASSET_RATIO_TARGET = 0.6;
const USE_SHORTS = false;
export default class BaseStockManager {
    stockStorage;
    totalProfit = 0;
    BUY_RETURN_THRESHOLD = 0;
    SELL_RETURN_THRESHOLD = 0;
    has4s = false;
    static calculateForecast(priceHistory) {
        return priceHistory.reduce((ups, price, idx) => idx === 0 ? 0 : (priceHistory[idx - 1] > price ? ups + 1 : ups), 0) / (priceHistory.length - 1);
    }
    static detectInversion(a, b) {
        return ((a >= 0.5 + (INVERSION_DETECTION_TOLERANCE / 2)) && (b <= 0.5 - (INVERSION_DETECTION_TOLERANCE / 2)) && b <= (1 - a) + INVERSION_DETECTION_TOLERANCE)
            || ((a <= 0.5 - (INVERSION_DETECTION_TOLERANCE / 2)) && (b >= 0.5 + (INVERSION_DETECTION_TOLERANCE / 2)) && b >= (1 - a) - INVERSION_DETECTION_TOLERANCE);
    }
    static attemptPurchasing4s(ns) {
        const player = PlayerUtils.getPlayer(ns);
        const bitnodeMultipliers = ns.getBitNodeMultipliers();
        const cost4sData = bitnodeMultipliers.FourSigmaMarketDataCost * FOUR_SIGMA_MARKET_DATA_COST;
        const cost4sApi = bitnodeMultipliers.FourSigmaMarketDataApiCost * FOUR_SIGMA_MARKET_DATA_API_COST;
        const totalCost = (player.has4SData ? 0 : cost4sData) + cost4sApi;
        if (player.money > totalCost) {
            if (!player.has4SData) {
                if (ns.stock.purchase4SMarketData()) {
                    LogAPI.printLog(ns, 'Purchased the 4S Market Data.');
                }
            }
            if (ns.stock.purchase4SMarketDataTixApi()) {
                LogAPI.printLog(ns, 'Purchased the 4S Market Data Tix API.');
            }
        }
    }
    static async getStockInformation(ns, stockStorage) {
        const dict = {};
        for (const stock of stockStorage.stocks) {
            const position = ns.stock.getPosition(stock.symbol);
            const askPrice = ns.stock.getAskPrice(stock.symbol);
            const bidPrice = ns.stock.getBidPrice(stock.symbol);
            const ownedShares = position[0] + position[2];
            // TODO: Read these values from files if we have them, otherwise use a runner
            dict[stock.symbol] = {
                maxShares: ns.stock.getMaxShares(stock.symbol),
                ownedShares,
                sharesLong: position[0],
                sharesShort: position[2],
                priceInformation: {
                    askPrice,
                    bidPrice,
                    spread: askPrice - bidPrice,
                    spreadPercentage: (askPrice - bidPrice) / askPrice,
                    price: (askPrice + bidPrice) / 2,
                    boughtPrice: position[1],
                    boughtPriceShort: position[3],
                },
                position,
                // NOTE: This requires us to always make sure that the purchases are up-to-date
                purchases: stock.stockInformation?.purchases || [],
            };
            // TODO: Assert that the purchases and owned shares line up
        }
        return dict;
    }
    async initialize(ns) {
        Utils.disableLogging(ns);
        ns.atExit(this.destroy.bind(this, ns));
        // TODO: This should be done differently
        this.stockStorage = new StockStorage(ns); // TODO: Here we should read the stock file
    }
    async start(ns) {
        if (this.stockStorage.totalTicks === 0) {
            // Initialize the values in the stock storage
            const stockInformationDict = await BaseStockManager.getStockInformation(ns, this.stockStorage);
            this.stockStorage.updateStockInformation(stockInformationDict);
            const stockForecastDict = this.getStockForecast(ns, this.stockStorage, {});
            this.stockStorage.updateStockForecast(stockForecastDict);
            this.stockStorage.tick();
        }
    }
    async destroy(ns) {
        // Inherited, but we do nothing
    }
    setStockStorage(stockStorage) {
        this.stockStorage = stockStorage;
    }
    getStockStorage() {
        return this.stockStorage;
    }
    async managingLoop(ns) {
        if (!this.has4s) {
            BaseStockManager.attemptPurchasing4s(ns);
        }
        const stockInformationDict = await BaseStockManager.getStockInformation(ns, this.stockStorage);
        const hasTicked = this.stockStorage.stocks.some((stock) => stock.stockInformation.priceInformation.askPrice !== stockInformationDict[stock.symbol].priceInformation.askPrice);
        this.stockStorage.updateStockInformation(stockInformationDict);
        if (hasTicked) {
            this.stockStorage.tick();
            const stockInversionDict = this.getPossibleInversions(ns, this.stockStorage);
            this.stockStorage.detectMarketCycle(ns, stockInversionDict, this.has4s);
            const stockForecastDict = this.getStockForecast(ns, this.stockStorage, stockInversionDict);
            this.stockStorage.updateStockForecast(stockForecastDict);
        }
        if (!this.has4s && !this.stockStorage.hasEnoughHistory()) {
            LogAPI.printLog(ns, `Building a history of stock prices, currently at ${this.stockStorage.getHistoryLength()}/${STOCK_CONSTANT.PRICE_HISTORY_THRESHOLD}`);
            return;
        }
        this.printSummary(ns);
        const sales = this.sellUnderperformingStocks(ns);
        // If we sold anything, we will have to refresh our stats before making any purchases
        if (sales.length > 0) {
            this.totalProfit += sales.reduce((total, sale) => total + sale.profit, 0);
            return;
        }
        const workingAssetRatio = this.getWorkingAssetRatio(ns);
        if (workingAssetRatio < WORKING_ASSET_RATIO_TARGET) {
            // NOTE: We don't have to remove the costs from the total profits here. We will incorporate that in our
            // sales
            const purchases = await this.buyStocks(ns);
        }
    }
    sellUnderperformingStocks(ns) {
        const sales = [];
        for (const stock of this.stockStorage.getOwnedStocks()) {
            if (!this.willUnderperform(stock))
                continue;
            if (!this.shouldSell(stock)) {
                const currentHoldTimes = stock.stockInformation.purchases.map((purchase) => purchase.ticksHeld);
                LogAPI.printLog(ns, `Thinking about selling ${stock.symbol}, but waiting for the minimum hold time. Current time(s): ${currentHoldTimes}.`);
                continue;
            }
            const sale = stock.sellAll(ns);
            // TODO: Verify the sale and check whether everything went well
            sales.push(sale);
        }
        return sales;
    }
    shouldSell(stock) {
        return true;
    }
    shouldBuy(stock) {
        if (stock.getBlackoutWindow() >= this.stockStorage.getTicksUntilMarketCycle())
            return false;
        if (stock.stockInformation.ownedShares === stock.stockInformation.maxShares)
            return false;
        if (Math.abs(stock.getExpectedReturn()) <= this.BUY_RETURN_THRESHOLD)
            return false;
        if (!USE_SHORTS && stock.willDecrease())
            return false;
        return true;
    }
    willUnderperform(stock) {
        return Math.abs(stock.getExpectedReturn()) <= this.getSellThreshold() ||
            (stock.willIncrease() && stock.stockInformation.sharesShort > 0) ||
            (stock.willDecrease() && stock.stockInformation.sharesLong > 0);
    }
    // Calculates the earning assets to total assets ratio
    getWorkingAssetRatio(ns) {
        const cash = PlayerUtils.getPlayer(ns).money;
        const corpus = this.stockStorage.getCorpus();
        return corpus / cash;
    }
    getBudget(ns) {
        const cash = PlayerUtils.getPlayer(ns).money;
        const corpus = this.stockStorage.getCorpus();
        return (WORKING_ASSET_RATIO_TARGET - (corpus / cash)) * cash;
    }
    async buyStocks(ns) {
        const prioritizedStocks = this.prioritizeStocks(this.stockStorage.stocks);
        const purchases = [];
        for (const stock of prioritizedStocks) {
            let budget = this.getBudget(ns);
            if (budget <= 0)
                break;
            if (!this.shouldBuy(stock))
                continue;
            // Ensure that we have a diversified portfolio
            const remainingStockBudget = (DIVERSIFICATION_FACTOR - (stock.getMoneyInvested() / this.stockStorage.getCorpus())) * this.stockStorage.getCorpus();
            if (remainingStockBudget)
                budget = Math.min(budget, remainingStockBudget);
            const price = (stock.willIncrease()) ? stock.stockInformation.priceInformation.askPrice : stock.stockInformation.priceInformation.bidPrice;
            let numShares = Math.floor((budget - STOCK_CONSTANT.STOCK_COMMISSION) / price);
            numShares = Math.min(numShares, stock.stockInformation.maxShares - stock.stockInformation.ownedShares);
            if (numShares <= 0)
                continue;
            // We might not be able to earn our money back
            const profitableTicksBeforeCycleEnd = this.stockStorage.getTicksUntilMarketCycle() - stock.getTimeToCoverSpread();
            if (profitableTicksBeforeCycleEnd < 1)
                continue;
            const estimatedEndOfCycleValue = numShares * price * ((Math.abs(stock.getExpectedReturn()) + 1) ** profitableTicksBeforeCycleEnd - 1);
            if (estimatedEndOfCycleValue <= 2 * STOCK_CONSTANT.STOCK_COMMISSION) {
                LogAPI.printLog(ns, `Despite attractive ER of ${Math.abs(stock.getExpectedReturn()) * 100 * 100}, ${stock.symbol} was not bought.`);
                continue;
            }
            let purchase;
            if (stock.willIncrease()) {
                purchase = await stock.buyLongs(ns, numShares);
            }
            else if (stock.willDecrease()) {
                purchase = await stock.buyShorts(ns, numShares);
            }
            else
                continue;
            this.stockStorage.addPurchase(ns, stock, purchase);
            purchases.push(purchase);
        }
        return purchases;
    }
    printSummary(ns) {
        const ownedStocks = this.stockStorage.getOwnedStocks();
        const maxReturnBP = 10000 * Math.max(...ownedStocks.map((stock) => Math.abs(stock.getExpectedReturn())));
        const minReturnBP = 10000 * Math.min(...ownedStocks.map((stock) => Math.abs(stock.getExpectedReturn())));
        const estimatedHoldingsCost = ownedStocks.reduce((total, stock) => {
            return stock.stockInformation.purchases.reduce((subtotal, purchase) => {
                return subtotal + STOCK_CONSTANT.STOCK_COMMISSION + purchase.numShares * purchase.price;
            }, 0);
        }, 0);
        const liquidationValue = ownedStocks.reduce((total, stock) => total - STOCK_CONSTANT.STOCK_COMMISSION + stock.getValue(), 0);
        const numLongs = ownedStocks.filter((stock) => stock.stockInformation.sharesLong > 0).length;
        const numShorts = ownedStocks.filter((stock) => stock.stockInformation.sharesShort > 0).length;
        LogAPI.printLog(ns, `Currently holding ${numLongs} longs and ${numShorts} shorts of ${this.stockStorage.stocks.length} total stocks.`);
        if (ownedStocks.length > 0) {
            LogAPI.printLog(ns, `Expected return is ${minReturnBP}-${maxReturnBP} BP.\n` +
                `Achieved profit: ${this.totalProfit}; Holdings: ${liquidationValue} with cost: ${estimatedHoldingsCost}\n` +
                `Current profit: ${this.totalProfit + liquidationValue - estimatedHoldingsCost}`);
        }
    }
    prioritizeStocks(stocks) {
        return stocks.sort((a, b) => {
            return (Math.ceil(a.getTimeToCoverSpread()) - Math.ceil(b.getTimeToCoverSpread())) ||
                (Math.abs(b.getExpectedReturn()) - Math.abs(a.getExpectedReturn()));
        });
    }
    getPossibleInversions(ns, stockStorage) {
        // TODO: We first have to update the price history for this
        const dict = {};
        for (const stock of stockStorage.stocks) {
            dict[stock.symbol] = this.preDetectPossibleInversion(ns, stock);
        }
        return dict;
    }
    // Also updates the stockStorage if we detected a new tick
    getStockForecast(ns, stockStorage, stockInversionDict) {
        const stockForecastDict = {};
        // TODO: Find a way to prevent pre-detecting, in order to reduce calls made
        for (const stock of stockStorage.stocks) {
            // NOTE: We have to keep the last inversion in the calculation of the stock forecast information
            // Perhaps make this a parameter in the calculation function
            if (stockInversionDict[stock.symbol] && this.verifyStockInversion(ns)) {
                stock.stockForecastInformation.tools.lastInversion = this.stockStorage.cycleTick;
            }
            else if (stock.stockForecastInformation?.tools?.lastInversion)
                stock.stockForecastInformation.tools.lastInversion++;
            stockForecastDict[stock.symbol] = this.calculateStockForecastInformation(ns, stock);
        }
        return stockForecastDict;
    }
}
