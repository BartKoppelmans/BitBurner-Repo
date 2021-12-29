/*
 CREDITS: This script was heavily influenced by the amazing work of @Insight.

 NOTE: This script forms the main entry point for the @EarlyStockManager and @LateStockManager classes
 */

import type { BitNodeMultipliers, NS, Player as BitBurnerPlayer } from 'Bitburner'
import * as LogAPI                                                from '/src/api/LogAPI.js'
import * as Utils                                                 from '/src/util/Utils.js'
import { Manager }                                                from '/src/classes/Misc/ScriptInterfaces.js'
import { EarlyStockManager }                                      from '/src/classes/Stock/EarlyStockManager.js'
import { LateStockManager }                                       from '/src/classes/Stock/LateStockManager.js'
import * as PlayerUtils                                           from '/src/util/PlayerUtils.js'
import {
	StockForecastDict,
	StockForecastInformation,
	StockInformationDict,
	StockInversionDict,
	StockPosition,
	StockPurchase,
	StockSale,
}                                                                 from '/src/classes/Stock/StockInterfaces.js'
import { PRICE_HISTORY_THRESHOLD, StockStorage }                  from '/src/classes/Storage/StockStorage.js'
import Stock, { STOCK_COMMISSION }                                from '/src/classes/Stock/Stock.js'


// TODO: Manage the exports better, because this is just shit

const LOOP_DELAY: number = 1000 as const

const INVERSION_DETECTION_TOLERANCE: number = 0.10 as const

const DIVERSIFICATION_FACTOR: number = 0.33 as const

export const INVERSION_LAG_TOLERANCE: number          = 5 as const
export const MAX_PRICE_HISTORY_LENGTH: number         = 151 as const
export const NEAR_TERM_FORECAST_WINDOW_LENGTH: number = 10
export const LONG_TERM_FORECAST_WINDOW_LENGTH: number = 51

const FOUR_SIGMA_MARKET_DATA_COST: number     = 5000000000 as const
const FOUR_SIGMA_MARKET_DATA_API_COST: number = 25000000000 as const

const WORKING_ASSET_RATIO_TARGET: number = 0.6 as const

const USE_SHORTS: boolean = false as const

export abstract class StockManager implements Manager {
	stockStorage!: StockStorage

	totalProfit: number = 0

	BUY_RETURN_THRESHOLD: number  = 0
	SELL_RETURN_THRESHOLD: number = 0

	has4s: boolean = false

	protected static calculateForecast(priceHistory: number[]): number {
		return priceHistory.reduce((ups, price, idx) => idx === 0 ? 0 : (priceHistory[idx - 1] > price ? ups + 1 : ups), 0) / (priceHistory.length - 1)
	}

	protected static detectInversion(a: number, b: number): boolean {
		return ((a >= 0.5 + (INVERSION_DETECTION_TOLERANCE / 2)) && (b <= 0.5 - (INVERSION_DETECTION_TOLERANCE / 2)) && b <= (1 - a) + INVERSION_DETECTION_TOLERANCE)
			|| ((a <= 0.5 - (INVERSION_DETECTION_TOLERANCE / 2)) && (b >= 0.5 + (INVERSION_DETECTION_TOLERANCE / 2)) && b >= (1 - a) - INVERSION_DETECTION_TOLERANCE)
	}

	private static attemptPurchasing4s(ns: NS) {
		const player: BitBurnerPlayer                = PlayerUtils.getPlayer(ns)
		const bitnodeMultipliers: BitNodeMultipliers = ns.getBitNodeMultipliers()
		const cost4sData: number                     = bitnodeMultipliers.FourSigmaMarketDataCost * FOUR_SIGMA_MARKET_DATA_COST
		const cost4sApi: number                      = bitnodeMultipliers.FourSigmaMarketDataApiCost * FOUR_SIGMA_MARKET_DATA_API_COST

		const totalCost: number = (player.has4SData ? 0 : cost4sData) + cost4sApi

		if (player.money > totalCost) {

			if (!player.has4SData) {
				if (ns.stock.purchase4SMarketData()) {
					LogAPI.printLog(ns, 'Purchased the 4S Market Data.')
				}
			}
			if (ns.stock.purchase4SMarketDataTixApi()) {
				LogAPI.printLog(ns, 'Purchased the 4S Market Data Tix API.')
			}

		}
	}

	private static async getStockInformation(ns: NS, stockStorage: StockStorage): Promise<StockInformationDict> {
		const dict: StockInformationDict = {}
		for (const stock of stockStorage.stocks) {

			const position: StockPosition = ns.stock.getPosition(stock.symbol)
			const askPrice                = ns.stock.getAskPrice(stock.symbol)
			const bidPrice                = ns.stock.getBidPrice(stock.symbol)

			const ownedShares: number = position[0] + position[2]

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
				purchases: stock.stockInformation.purchases,
			}

			// TODO: Assert that the purchases and owned shares line up
		}

		return dict
	}

	public async initialize(ns: NS) {
		Utils.disableLogging(ns)

		ns.atExit(this.destroy.bind(this, ns))

		// TODO: This should be done differently
		this.stockStorage = new StockStorage(ns) // TODO: Here we should read the stock file
	}

	public async start(ns: NS): Promise<void> {
		// Inherited
	}

	public async destroy(ns: NS): Promise<void> {
		// Inherited, but we do nothing
	}

	public async managingLoop(ns: NS): Promise<void> {

		if (!this.has4s) {
			StockManager.attemptPurchasing4s(ns)
		}

		const stockInformationDict: StockInformationDict = await StockManager.getStockInformation(ns, this.stockStorage)
		const hasTicked: boolean                         = this.stockStorage.stocks.some((stock) => stock.stockInformation.priceInformation.askPrice !== stockInformationDict[stock.symbol].priceInformation.askPrice)
		this.stockStorage.updateStockInformation(stockInformationDict)

		if (hasTicked) {
			this.stockStorage.tick()

			const stockInversionDict: StockInversionDict = this.getPossibleInversions(ns, this.stockStorage)

			this.stockStorage.detectMarketCycle(ns, stockInversionDict, this.has4s)

			const stockForecastDict: StockForecastDict = this.getStockForecast(ns, this.stockStorage, stockInversionDict)
			this.stockStorage.updateStockForecast(stockForecastDict)
		}

		if (!this.has4s && !this.stockStorage.hasEnoughHistory()) {
			LogAPI.printLog(ns, `Building a history of stock prices, currently at ${this.stockStorage.getHistoryLength()}/${PRICE_HISTORY_THRESHOLD}`)
			return
		}

		this.printSummary(ns)

		const sales: StockSale[] = this.sellUnderperformingStocks(ns)

		// If we sold anything, we will have to refresh our stats before making any purchases
		if (sales.length > 0) {
			this.totalProfit += sales.reduce((total, sale) => total + sale.profit, 0)
			return
		}

		const workingAssetRatio: number = this.getWorkingAssetRatio(ns)

		if (workingAssetRatio < WORKING_ASSET_RATIO_TARGET) {
			// NOTE: We don't have to remove the costs from the total profits here. We will incorporate that in our
			// sales
			const purchases: StockPurchase[] = await this.buyStocks(ns)
		}

	}

	protected sellUnderperformingStocks(ns: NS): StockSale[] {
		const sales: StockSale[] = []

		for (const stock of this.stockStorage.stocks) {
			if (!this.willUnderperform(stock)) continue

			if (!this.shouldSell(stock)) {
				const currentHoldTimes: number[] = stock.stockInformation.purchases.map((purchase) => purchase.ticksHeld)
				LogAPI.printLog(ns, `Thinking about selling ${stock.symbol}, but waiting for the minimum hold time. Current time(s): ${currentHoldTimes}.`)
				continue
			}

			const sale: StockSale = stock.sellAll(ns)

			// TODO: Verify the sale and check whether everything went well

			sales.push(sale)
		}

		return sales
	}

	protected shouldSell(stock: Stock): boolean {
		return true
	}

	protected shouldBuy(stock: Stock): boolean {
		if (stock.getBlackoutWindow() >= this.stockStorage.getTicksUntilMarketCycle()) return false
		if (stock.stockInformation.ownedShares === stock.stockInformation.maxShares) return false
		if (Math.abs(stock.getExpectedReturn()) <= this.BUY_RETURN_THRESHOLD) return false
		if (!USE_SHORTS && stock.willDecrease()) return false
		return true
	}

	protected willUnderperform(stock: Stock): boolean {
		return Math.abs(stock.getExpectedReturn()) <= this.getSellThreshold() ||
			(stock.willIncrease() && stock.stockInformation.sharesShort > 0) ||
			(stock.willDecrease() && stock.stockInformation.sharesLong > 0)
	}

	protected abstract getSellThreshold(): number

	protected abstract verifyStockInversion(ns: NS): boolean

	protected abstract preDetectPossibleInversion(ns: NS, stock: Stock): boolean;

	protected abstract calculateStockForecastInformation(ns: NS, stock: Stock): StockForecastInformation

	// Calculates the earning assets to total assets ratio
	private getWorkingAssetRatio(ns: NS): number {
		const cash: number   = PlayerUtils.getPlayer(ns).money
		const corpus: number = this.stockStorage.getCorpus()

		return corpus / cash
	}

	private getBudget(ns: NS): number {
		const cash: number   = PlayerUtils.getPlayer(ns).money
		const corpus: number = this.stockStorage.getCorpus()

		return (WORKING_ASSET_RATIO_TARGET - (corpus / cash)) * cash
	}

	private async buyStocks(ns: NS): Promise<StockPurchase[]> {
		const prioritizedStocks: Stock[] = this.prioritizeStocks(this.stockStorage.stocks)
		const purchases: StockPurchase[] = []

		for (const stock of prioritizedStocks) {

			let budget: number = this.getBudget(ns)
			if (budget <= 0) break

			if (!this.shouldBuy(stock)) continue

			// Ensure that we have a diversified portfolio
			const remainingStockBudget: number = (DIVERSIFICATION_FACTOR - (stock.getMoneyInvested() / this.stockStorage.getCorpus())) * this.stockStorage.getCorpus()
			budget                             = Math.min(budget, remainingStockBudget)

			const price: number   = (stock.willIncrease()) ? stock.stockInformation.priceInformation.askPrice : stock.stockInformation.priceInformation.bidPrice
			let numShares: number = Math.floor((budget - STOCK_COMMISSION) / price)
			numShares             = Math.min(numShares, stock.stockInformation.maxShares - stock.stockInformation.ownedShares)

			if (numShares <= 0) continue

			// We might not be able to earn our money back
			const profitableTicksBeforeCycleEnd: number = this.stockStorage.getTicksUntilMarketCycle() - stock.getTimeToCoverSpread()
			if (profitableTicksBeforeCycleEnd < 1) continue

			const estimatedEndOfCycleValue: number = numShares * price * ((Math.abs(stock.getExpectedReturn()) + 1) ** profitableTicksBeforeCycleEnd - 1)
			if (estimatedEndOfCycleValue <= 2 * STOCK_COMMISSION) {
				LogAPI.printLog(ns, `Despite attractive ER of ${Math.abs(stock.getExpectedReturn()) * 100 * 100}, ${stock.symbol} was not bought.`)
				continue
			}

			let purchase: StockPurchase
			if (stock.willIncrease()) {
				purchase = await stock.buyLongs(ns, numShares)
			} else if (stock.willDecrease()) {
				purchase = await stock.buyShorts(ns, numShares)
			} else continue
			purchases.push(purchase)
		}
		return purchases
	}

	private printSummary(ns: NS): void {
		const ownedStocks: Stock[]          = this.stockStorage.getOwnedStocks()
		const maxReturnBP                   = 10000 * Math.max(...ownedStocks.map((stock) => Math.abs(stock.getExpectedReturn())))
		const minReturnBP                   = 10000 * Math.min(...ownedStocks.map((stock) => Math.abs(stock.getExpectedReturn())))
		const estimatedHoldingsCost: number = ownedStocks.reduce((total, stock) => {
			return stock.stockInformation.purchases.reduce((subtotal, purchase) => {
				return subtotal + STOCK_COMMISSION + purchase.numShares * purchase.price
			}, 0)
		}, 0)

		const liquidationValue: number = ownedStocks.reduce((total, stock) => total - STOCK_COMMISSION + stock.getValue(), 0)

		const numLongs: number  = ownedStocks.filter((stock) => stock.stockInformation.sharesLong > 0).length
		const numShorts: number = ownedStocks.filter((stock) => stock.stockInformation.sharesShort > 0).length

		LogAPI.printLog(ns, `Currently holding ${numLongs} longs and ${numShorts} shorts of ${this.stockStorage.stocks.length} total stocks.`)

		if (ownedStocks.length > 0) {
			LogAPI.printLog(ns, `Expected return is ${minReturnBP}-${maxReturnBP} BP.\n` +
				`Achieved profit: ${this.totalProfit}; Holdings: ${liquidationValue} with cost: ${estimatedHoldingsCost}\n` +
				`Current profit: ${this.totalProfit + liquidationValue - estimatedHoldingsCost}`)
		}
	}

	private prioritizeStocks(stocks: Stock[]): Stock[] {
		return stocks.sort((a, b) => {
			return (Math.ceil(a.getTimeToCoverSpread()) - Math.ceil(b.getTimeToCoverSpread())) ||
				(Math.abs(b.getExpectedReturn()) - Math.abs(a.getExpectedReturn()))
		})
	}

	private getPossibleInversions(ns: NS, stockStorage: StockStorage): StockInversionDict {

		// TODO: We first have to update the price history for this

		const dict: StockInversionDict = {}
		for (const stock of stockStorage.stocks) {
			dict[stock.symbol] = this.preDetectPossibleInversion(ns, stock)
		}
		return dict
	}

	// Also updates the stockStorage if we detected a new tick
	private getStockForecast(ns: NS, stockStorage: StockStorage, stockInversionDict: StockInversionDict): StockForecastDict {
		const stockForecastDict: StockForecastDict = {}

		// TODO: Find a way to prevent pre-detecting, in order to reduce calls made
		for (const stock of stockStorage.stocks) {

			// NOTE: We have to keep the last inversion in the calculation of the stock forecast information
			// Perhaps make this a parameter in the calculation function

			if (stockInversionDict[stock.symbol] && this.verifyStockInversion(ns)) {
				stock.stockForecastInformation.tools.lastInversion = this.stockStorage.cycleTick
			} else stock.stockForecastInformation.tools.lastInversion++

			stockForecastDict[stock.symbol] = this.calculateStockForecastInformation(ns, stock)
		}

		return stockForecastDict
	}
}


async function startStockManager(ns: NS, StockManagerClass: typeof EarlyStockManager | typeof LateStockManager): Promise<StockManager> {
	const instance: StockManager = new StockManagerClass()

	// TODO: Read the passed flags and apply them in the initialize call

	await instance.initialize(ns)
	await instance.start(ns)

	return instance
}

async function stopStockManager(ns: NS, instance: StockManager): Promise<void> {
	await instance.destroy(ns)
}


export async function main(ns: NS) {
	if (ns.getHostname() !== 'home') {
		throw new Error('Run the script from home')
	}

	let player: BitBurnerPlayer = PlayerUtils.getPlayer(ns)

	if (!player.hasWseAccount) {
		throw new Error('Cannot run a StockManager without WSE access')
	}

	let instance: StockManager = await startStockManager(ns, (player.has4SDataTixApi) ? LateStockManager : EarlyStockManager)

	while (true) {
		player = PlayerUtils.getPlayer(ns)
		if (player.has4SDataTixApi && instance instanceof EarlyStockManager) {
			await stopStockManager(ns, instance)
			instance = await startStockManager(ns, LateStockManager)

			LogAPI.printLog(ns, `Restarting the StockManager.`)
		}

		await instance.managingLoop(ns)
		await ns.asleep(LOOP_DELAY)
	}
}