import { CONSTANT } from '/src/lib/constants.js'
import * as LogAPI  from '/src/api/LogAPI.js'
import Stock        from '/src/classes/Stock/Stock.js'
import {
	StockForecastDict,
	StockInformationDict,
	StockInversionDict,
	StockMap,
	StockPurchase,
}                   from '/src/classes/Stock/StockInterfaces.js'
import type { NS }  from 'Bitburner'
import {
	STOCK_CONSTANT,
}                   from '/src/classes/Stock/StockConstants.js'

const LAST_UPDATED_THRESHOLD: number = 2500 as const

const MARKET_CYCLE_LENGTH: number = 75 as const

const INVERSION_AGREEMENT_THRESHOLD_DEFAULT: number = 6 as const
const INVERSION_AGREEMENT_THRESHOLD_CAP: number     = 14 as const

export default class StockStorage {

	lastUpdated: Date                   = CONSTANT.EPOCH_DATE
	marketCycleDetected: boolean        = false
	cycleTick: number                   = 0
	totalTicks: number                  = 0
	stocks: Stock[]                     = []
	inversionAgreementThreshold: number = INVERSION_AGREEMENT_THRESHOLD_DEFAULT

	public constructor(ns: NS, stockMap?: StockMap) {
		if (stockMap && Date.now() - stockMap.lastUpdated.getTime() < LAST_UPDATED_THRESHOLD) {
			this.stocks              = stockMap.stocks
			this.lastUpdated         = stockMap.lastUpdated
			this.cycleTick           = stockMap.cycleTick
			this.marketCycleDetected = stockMap.marketCycleDetected
		} else this.initialize(ns)
	}

	public getStockMap(): StockMap {
		return {
			stocks: this.stocks,
			lastUpdated: this.lastUpdated,
			cycleTick: this.cycleTick,
			marketCycleDetected: this.marketCycleDetected,
		}
	}

	public getOwnedStocks(): Stock[] {
		return this.stocks.filter((stock) => stock.stockInformation.ownedShares > 0)
	}

	public detectMarketCycle(ns: NS, stockInversionDict: StockInversionDict, has4s: boolean): void {
		const historyLength: number = Math.min(this.totalTicks, STOCK_CONSTANT.MAX_PRICE_HISTORY_LENGTH)

		const numInversionsDetected: number = Object.keys(stockInversionDict)
		                                            .reduce((total, key) => total + +stockInversionDict[key], 0)

		if (numInversionsDetected > 0) {

			// We detected the market cycle!
			if (numInversionsDetected >= this.inversionAgreementThreshold && (has4s || historyLength >= STOCK_CONSTANT.PRICE_HISTORY_THRESHOLD)) {
				const predictedCycleTick = has4s ? 0 : STOCK_CONSTANT.NEAR_TERM_FORECAST_WINDOW_LENGTH

				LogAPI.printLog(ns, `Threshold for changing predicted market cycle met (${numInversionsDetected} >= ${this.inversionAgreementThreshold}).\nChanging current market tick from ${this.cycleTick} to ${predictedCycleTick}`)

				this.marketCycleDetected         = true
				this.cycleTick                   = predictedCycleTick
				this.inversionAgreementThreshold = Math.max(INVERSION_AGREEMENT_THRESHOLD_CAP, numInversionsDetected)
			}

		}
	}

	// This is somehow not correct I think, but I don't understand the original code
	public getEstimatedTick(): number {

		let tickEstimate: number = 0

		if (!this.marketCycleDetected) {
			tickEstimate = 5
		} else if (this.inversionAgreementThreshold <= 8) {
			tickEstimate = 15
		} else if (this.inversionAgreementThreshold <= 10) {
			tickEstimate = 30
		} else tickEstimate = MARKET_CYCLE_LENGTH

		return MARKET_CYCLE_LENGTH - Math.min(this.cycleTick, tickEstimate)
	}

	public getTicksUntilMarketCycle(): number {
		return MARKET_CYCLE_LENGTH - this.getEstimatedTick()
	}

	public hasEnoughHistory(): boolean {
		return this.getHistoryLength() >= STOCK_CONSTANT.PRICE_HISTORY_THRESHOLD
	}

	public getHistoryLength(): number {
		return Math.min(this.totalTicks, STOCK_CONSTANT.MAX_PRICE_HISTORY_LENGTH)
	}

	public getCorpus(): number {
		let corpus: number = 0
		for (const stock of this.stocks) {
			corpus += stock.getMoneyInvested()
		}
		return corpus
	}

	public addPurchase(ns: NS, stock: Stock, purchase: StockPurchase): void {
		const index: number = this.stocks.findIndex((s) => s.symbol === stock.symbol)
		if (index === -1) throw new Error(`Couldn't find the stock`)
		this.stocks[index].stockInformation.purchases.push(purchase)
	}

	public getTotalStockValue(): number {
		let totalStockValue: number = 0
		for (const stock of this.stocks) {
			totalStockValue += stock.getValue()
		}
		return totalStockValue
	}

	public tick(): void {

		this.cycleTick = (this.cycleTick + 1) % MARKET_CYCLE_LENGTH
		this.totalTicks++

		this.stocks.forEach((stock) => stock.addToPriceHistory(stock.stockInformation.priceInformation.price))

		// Update the ticks held for our purchases
		for (const stock of this.stocks) {
			stock.stockInformation.purchases.forEach((purchase: StockPurchase, index, purchases) => {
				purchases[index] = {
					...purchase,
					ticksHeld: purchase.ticksHeld + 1,
				}
			})
		}

		// TODO: Verify that all our stocks are still valid, this means:
		//       - That we only have one type of share, amongst possible other things

		this.lastUpdated = new Date()
	}

	public updateStockInformation(dict: StockInformationDict): void {
		Object.entries(dict).forEach(
			([key, value]) => {
				const stock: Stock | undefined = this.stocks.find((s) => s.symbol === key)
				if (!stock) throw new Error(`We don't have the stock`)
				stock.updateStockInformation(value)
			},
		)

		this.lastUpdated = new Date()
	}

	public updateStockForecast(dict: StockForecastDict): void {
		Object.entries(dict).forEach(
			([key, value]) => {
				const stock: Stock | undefined = this.stocks.find((s) => s.symbol === key)
				if (!stock) throw new Error(`We don't have the stock`)
				stock.updateForecastInformation(value)
			},
		)

		this.lastUpdated = new Date()
	}

	private initialize(ns: NS): void {
		// TODO: Use a runner for this
		const symbols: string[] = ns.stock.getSymbols()
		this.stocks             = symbols.map((symbol) => new Stock(ns, symbol))

		// TODO:    We probably need to do more, but meh for now
		//          We'll do that when we go to the testing era
	}
}