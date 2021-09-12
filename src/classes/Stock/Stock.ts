import type { BitBurner as NS, StockSymbol } from 'Bitburner'
import { StockInformation, StockPosition }   from '/src/classes/Stock/StockInterfaces.js'
import * as LogAPI                           from '/src/api/LogAPI.js'
import { LogType }                           from '/src/api/LogAPI.js'

const STOCK_COMMISSION: number = 100000 as const

export default class Stock {

	symbol: StockSymbol
	position: StockPosition
	stockInformation!: StockInformation

	public constructor(ns: NS, symbol: StockSymbol) {
		this.symbol = symbol
		this.update(ns)
		this.position = this.stockInformation.probability >= 0 ? StockPosition.LONG : StockPosition.SHORT
	}

	public static getStocks(ns: NS): Stock[] {
		const symbols: StockSymbol[] = ns.getStockSymbols()
		return symbols.map((symbol) => new Stock(ns, symbol))
	}

	public hasShares(ns: NS): boolean {
		return this.stockInformation.ownedShort + this.stockInformation.ownedLong > 0
	}

	public hasMaxShares(ns: NS): boolean {
		return this.stockInformation.ownedShort + this.stockInformation.ownedLong === this.stockInformation.maxShares
	}

	public getStockCorpus(ns: NS): number {
		return this.stockInformation.ownedShort * this.stockInformation.averageShortPrice + this.stockInformation.ownedLong * this.stockInformation.averageLongPrice
	}

	public buyShorts(ns: NS, numShares: number): void {
		// TODO: Check whether we can buy that many shares

		const value: number = ns.shortStock(this.symbol, numShares)
		LogAPI.log(ns, `Bought ${numShares} shorts for ${ns.nFormat(value, '$0.000a')}. Invested: ${ns.nFormat((value * numShares), '$0.000a')}`, LogType.STOCK)
		this.update(ns)
	}

	public buyLongs(ns: NS, numShares: number): void {
		// TODO: Check whether we can buy that many shares

		const value: number = ns.buyStock(this.symbol, numShares)
		LogAPI.log(ns, `Bought ${numShares} longs for ${ns.nFormat(value, '$0.000a')}. Invested: ${ns.nFormat((value * numShares), '$0.000a')}`, LogType.STOCK)
		this.update(ns)
	}

	public sellAll(ns: NS): void {
		if (this.stockInformation.ownedShort > 0) this.sellShorts(ns)
		if (this.stockInformation.ownedLong > 0) this.sellLongs(ns)
	}

	public sellShorts(ns: NS): void {
		if (this.stockInformation.ownedShort <= 0) throw new Error(`No owned short shares for ${this.symbol}`)

		const value: number  = ns.sellShort(this.symbol, this.stockInformation.ownedShort)
		const profit: number = this.stockInformation.ownedShort * (this.stockInformation.averageShortPrice - value) - 2 * STOCK_COMMISSION
		if (value) {
			LogAPI.log(ns, `Sold ${this.stockInformation.ownedShort} shorts for ${ns.nFormat(value, '$0.000a')}. Profit: ${ns.nFormat(profit, '$0.000a')}`, LogType.STOCK)
			this.update(ns)
		}
	}

	public sellLongs(ns: NS): void {
		if (this.stockInformation.ownedLong <= 0) throw new Error(`No owned long shares for ${this.symbol}`)

		const value: number  = ns.sellStock(this.symbol, this.stockInformation.ownedLong)
		const profit: number = this.stockInformation.ownedLong * (value - this.stockInformation.averageLongPrice) - 2 * STOCK_COMMISSION
		if (value) {
			LogAPI.log(ns, `Sold ${this.stockInformation.ownedLong} longs for ${ns.nFormat(value, '$0.000a')}. Profit: ${ns.nFormat(profit, '$0.000a')}`, LogType.STOCK)
			this.update(ns)
		}
	}

	// TODO: Keep the last moment of update to make sure that we update in time
	public update(ns: NS): void {
		const volatility: number                                           = ns.getStockVolatility(this.symbol)
		const probability: number                                          = ns.getStockForecast(this.symbol) - 0.5
		const [ownedLong, averageLongPrice, ownedShort, averageShortPrice] = ns.getStockPosition(this.symbol)

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
		}
	}
}