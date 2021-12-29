import type { NS } from 'Bitburner'
import {
	ManualStockForecastInformation,
	StockForecastInformation,
	StockInformation,
	StockPurchase,
	StockSale,
}                  from '/src/classes/Stock/StockInterfaces.js'
import {
	STOCK_CONSTANT,
}                  from '/src/classes/Stock/StockConstants.js'

export default class Stock {

	symbol: string

	stockInformation!: StockInformation
	stockForecastInformation!: StockForecastInformation // Custom forecast in case we don't have the API

	priceHistory: number[] = []

	public constructor(ns: NS, symbol: string) {
		this.symbol = symbol
	}

	private static isManualStockForecastInformation(stockForecastInformation: ManualStockForecastInformation | StockForecastInformation): stockForecastInformation is ManualStockForecastInformation {
		return (stockForecastInformation as ManualStockForecastInformation).probabilitySigma !== undefined
	}

	public updateStockInformation(stockInformation: StockInformation): void {
		this.stockInformation = stockInformation
	}

	public updateForecastInformation(stockForecastInformation: StockForecastInformation): void {
		this.stockForecastInformation = stockForecastInformation
	}

	public getExpectedReturn(): number {
		const normalizedProbability: number = (this.stockForecastInformation.probability - 0.5)

		let sigma: number = 0
		if (Stock.isManualStockForecastInformation(this.stockForecastInformation)) {
			// To add conservatism to pre-4s estimates, we reduce the probability by 1 standard deviation without
			// crossing the midpoint
			sigma = this.stockForecastInformation.probabilitySigma
		}

		const conservativeProbability: number = (normalizedProbability < 0) ?
			Math.min(0, normalizedProbability + sigma) :
			Math.max(0, normalizedProbability - sigma)

		return this.stockForecastInformation.volatility * conservativeProbability
	}

	public addToPriceHistory(price: number): void {
		this.priceHistory.unshift(price)
		if (this.priceHistory.length > STOCK_CONSTANT.MAX_PRICE_HISTORY_LENGTH) {
			this.priceHistory.splice(STOCK_CONSTANT.MAX_PRICE_HISTORY_LENGTH, 1)
		}
	}

	public getMoneyInvested(): number {
		let totalMoneyInvested: number = 0
		for (const purchase of this.stockInformation.purchases) {
			totalMoneyInvested += purchase.numShares * purchase.price
		}
		return totalMoneyInvested
	}

	public getTimeToCoverSpread(): number {
		return Math.log(this.stockInformation.priceInformation.askPrice / this.stockInformation.priceInformation.bidPrice) / Math.log(1 + Math.abs(this.getExpectedReturn()))
	}

	public getBlackoutWindow(): number {
		return Math.ceil(this.getTimeToCoverSpread())
	}

	public getValue(): number {
		let totalValue: number = 0

		for (const purchase of this.stockInformation.purchases) {
			if (purchase.type === 'long') {
				totalValue += purchase.numShares * this.stockInformation.priceInformation.bidPrice
			} else if (purchase.type === 'short') {
				totalValue += purchase.numShares * (2 * purchase.price - this.stockInformation.priceInformation.askPrice)
			}
		}

		return totalValue
	}

	public willIncrease(): boolean {
		return this.stockForecastInformation.probability >= 0.5
	}

	public willDecrease(): boolean {
		return this.stockForecastInformation.probability < 0.5
	}

	public buyShorts(ns: NS, numShares: number): StockPurchase {

		// TODO: Check whether we can buy the stock (should already be possible)

		const expectedPrice: number = this.stockInformation.priceInformation.bidPrice
		let price: number           = ns.stock.short(this.symbol, numShares)  // TODO: Make this into a runner

		if (price === 0) throw new Error(`Failed to short the stocks`)
		else if (price !== expectedPrice) {
			// TODO: Log
			// NOTE: This is a known bitburner bug, so patch it internally here
			price = expectedPrice
		}

		this.stockInformation.sharesShort += numShares

		return {
			type: 'short',
			ticksHeld: 0,
			numShares,
			price,
		}
	}

	public buyLongs(ns: NS, numShares: number): StockPurchase {

		// TODO: Check whether we can buy the stock (should already be possible)

		const expectedPrice: number = this.stockInformation.priceInformation.askPrice
		let price: number           = ns.stock.buy(this.symbol, numShares)  // TODO: Make this into a runner

		if (price === 0) throw new Error(`Failed to buy the stocks`)
		else if (price !== expectedPrice) {
			// TODO: Log
			// NOTE: This is a known bitburner bug, so patch it internally here
			price = expectedPrice
		}

		this.stockInformation.sharesShort += numShares

		return {
			type: 'long',
			ticksHeld: 0,
			numShares,
			price,
		}
	}

	public sellAll(ns: NS): StockSale {

		if (this.stockInformation.ownedShares === 0) {
			throw new Error(`We didn't have any shares, so something went wrong`)
		}

		if (this.stockInformation.sharesLong > 0) {
			return this.sellLongs(ns)
		} else if (this.stockInformation.sharesShort > 0) {
			return this.sellShorts(ns)
		} else {
			// We didn't have any shares, so something went wrong
			throw new Error(`We didn't have any shares, so something went wrong`)
		}

	}

	public sellShorts(ns: NS): StockSale {
		const expectedPrice: number = this.stockInformation.priceInformation.askPrice
		const numShares: number     = this.stockInformation.sharesShort

		let price: number = ns.stock.sellShort(this.symbol, numShares) // TODO: Make this into a runner
		if (price === 0) throw new Error(`Failed to sell the stocks`)
		else if (price !== expectedPrice) {
			// TODO: Log
			// NOTE: This is a known bitburner bug, so patch it internally here
			price = expectedPrice
		}

		let money: number  = 0
		let profit: number = 0
		for (const purchase of this.stockInformation.purchases) {
			profit += (purchase.numShares * (purchase.price - price)) - 2 * STOCK_CONSTANT.STOCK_COMMISSION
			money += (price * numShares) - STOCK_CONSTANT.STOCK_COMMISSION
		}

		this.stockInformation.purchases = []

		return {
			type: 'short',
			ticksHeld: Math.max(...this.stockInformation.purchases.map((purchase) => purchase.ticksHeld)),
			numShares,
			money,
			profit,
		}
	}

	public sellLongs(ns: NS): StockSale {
		const expectedPrice: number = this.stockInformation.priceInformation.bidPrice
		const numShares: number     = this.stockInformation.sharesLong

		let price: number = ns.stock.sell(this.symbol, numShares) // TODO: Make this into a runner
		if (price === 0) throw new Error(`Failed to sell the stocks`)
		else if (price !== expectedPrice) {
			// TODO: Log
			// NOTE: This is a known bitburner bug, so patch it internally here
			price = expectedPrice
		}

		let money: number  = 0
		let profit: number = 0
		for (const purchase of this.stockInformation.purchases) {
			profit += (purchase.numShares * (price - purchase.price)) - 2 * STOCK_CONSTANT.STOCK_COMMISSION
			money += (price * numShares) - STOCK_CONSTANT.STOCK_COMMISSION
		}

		this.stockInformation.purchases = []

		// TODO: Log

		return {
			type: 'long',
			ticksHeld: Math.max(...this.stockInformation.purchases.map((purchase) => purchase.ticksHeld)),
			numShares,
			money,
			profit,
		}
	}
}