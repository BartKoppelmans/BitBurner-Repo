import type { NS }                         from 'Bitburner'
import { StockInformation, StockPosition } from '/src/classes/Stock/StockInterfaces.js'
import * as LogAPI                         from '/src/api/LogAPI.js'

const STOCK_COMMISSION: number = 100000 as const

export default class Stock {

	symbol: string
	position: StockPosition
	stockInformation!: StockInformation

	public constructor(ns: NS, symbol: string) {
		this.symbol = symbol
		this.update(ns)
		this.position = this.stockInformation.probability >= 0 ? StockPosition.LONG : StockPosition.SHORT
	}

	public static getStocks(ns: NS): Stock[] {
		const symbols: string[] = ns.stock.getSymbols()
		return symbols.map((symbol) => new Stock(ns, symbol))
	}

	public hasShares(): boolean {
		return this.stockInformation.ownedShort + this.stockInformation.ownedLong > 0
	}

	public hasMaxShares(): boolean {
		return this.stockInformation.ownedShort + this.stockInformation.ownedLong === this.stockInformation.maxShares
	}

	public getStockCorpus(): number {
		return this.stockInformation.ownedShort * this.stockInformation.averageShortPrice + this.stockInformation.ownedLong * this.stockInformation.averageLongPrice
	}

	public buyShorts(ns: NS, numShares: number): void {
		// TODO: Check whether we can buy that many shares

		const costs: number = ns.stock.short(this.symbol, numShares)

		if (costs > this.stockInformation.price) {
			LogAPI.printLog(ns, `WARNING: Intended to buy ${this.symbol} at ${ns.nFormat(this.stockInformation.price, '$0.000a')} but price was ${ns.nFormat(costs, '$0.000a')}`)
		}

		LogAPI.printLog(ns, `Bought ${numShares} shorts of ${this.symbol} for ${ns.nFormat(costs, '$0.000a')}. Invested: ${ns.nFormat((costs * numShares), '$0.000a')}`)
		this.update(ns)
	}

	public buyLongs(ns: NS, numShares: number): void {
		// TODO: Check whether we can buy that many shares
		const costs: number = ns.stock.buy(this.symbol, numShares)

		if (costs > this.stockInformation.price) {
			LogAPI.printLog(ns, `WARNING: Intended to buy ${this.symbol} at ${ns.nFormat(this.stockInformation.price, '$0.000a')} but price was ${ns.nFormat(costs, '$0.000a')}`)
		}

		LogAPI.printLog(ns, `Bought ${numShares} longs of ${this.symbol} for ${ns.nFormat(costs, '$0.000a')}. Invested: ${ns.nFormat((costs * numShares), '$0.000a')}`)
		this.update(ns)
	}

	public sellAll(ns: NS): void {
		if (this.stockInformation.ownedShort > 0) this.sellShorts(ns)
		if (this.stockInformation.ownedLong > 0) this.sellLongs(ns)
	}

	public sellShorts(ns: NS): number {
		if (this.stockInformation.ownedShort <= 0) throw new Error(`No owned short shares for ${this.symbol}`)

		const value: number = ns.stock.sellShort(this.symbol, this.stockInformation.ownedShort)
		if (value) {
			const profit: number = this.stockInformation.ownedShort * (this.stockInformation.averageShortPrice - value) - 2 * STOCK_COMMISSION
			LogAPI.printLog(ns, `Sold ${this.stockInformation.ownedShort} shorts of ${this.symbol} for ${ns.nFormat(value, '$0.000a')}. Profit: ${ns.nFormat(profit, '$0.000a')}`)
			this.update(ns)
			return profit
		}
		return 0
	}

	public sellLongs(ns: NS): number {
		if (this.stockInformation.ownedLong <= 0) throw new Error(`No owned long shares for ${this.symbol}`)

		const value: number = ns.stock.sell(this.symbol, this.stockInformation.ownedLong)
		if (value) {
			const profit: number = this.stockInformation.ownedLong * (value - this.stockInformation.averageLongPrice) - 2 * STOCK_COMMISSION
			LogAPI.printLog(ns, `Sold ${this.stockInformation.ownedLong} longs of ${this.symbol} for ${ns.nFormat(value, '$0.000a')}. Profit: ${ns.nFormat(profit, '$0.000a')}`)
			this.update(ns)
			return profit
		}
		return 0
	}

	// TODO: Keep the last moment of update to make sure that we update in time
	public update(ns: NS): void {
		const volatility: number                                           = ns.stock.getVolatility(this.symbol)
		const probability: number                                          = 2 * (ns.stock.getForecast(this.symbol) - 0.5)
		const [ownedLong, averageLongPrice, ownedShort, averageShortPrice] = ns.stock.getPosition(this.symbol)

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
		}
	}
}