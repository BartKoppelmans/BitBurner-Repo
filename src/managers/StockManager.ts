import type { BitBurner as NS } from 'Bitburner'
import * as LogAPI              from '/src/api/LogAPI.js'
import * as Utils               from '/src/util/Utils.js'
import * as PlayerUtils         from '/src/util/PlayerUtils.js'
import { Manager }              from '/src/classes/Misc/ScriptInterfaces.js'
import { CONSTANT }             from '/src/lib/constants.js'
import Stock                    from '/src/classes/Stock/Stock.js'
import { StockPosition }        from '/src/classes/Stock/StockInterfaces.js'

const LOOP_DELAY: number                    = 1000 as const
const STOCK_ALLOWANCE: number               = 0.05 as const
const STOCK_COMMISSION: number              = 100000 as const
const MINIMUM_MONEY_TO_INVEST: number       = 10 * STOCK_COMMISSION
const EXPECTED_RETURN_BUY_THRESHOLD: number = 0.0002 as const // Buy anything forecasted to earn better than a 0.02%
                                                              // return
const EXPECTED_RETURN_SELL_THRESHOLD: number = 0.0001 as const // Buy anything forecasted to earn better than a 0.02%
                                                               // return

class StockManager implements Manager {

	private managingLoopTimeout?: ReturnType<typeof setTimeout>
	private stocks: Stock[] = []

	private startingCorpus: number = 0
	private lastCorpus: number     = 0

	private runningProfit: number     = 0
	private lastRunningProfit: number = 0

	private static getBudget(ns: NS, stocks: Stock[]): number {
		const corpus: number = stocks.reduce((total, stock) => total + stock.getStockCorpus(), 0)

		const totalBudget: number = STOCK_ALLOWANCE * PlayerUtils.getMoney(ns)
		return totalBudget - corpus
	}

	private static hasShortAccess(ns: NS): boolean {
		return ns.getPlayer().bitNodeN === 8 ||
			ns.getOwnedSourceFiles().includes({ n: 8, lvl: 2 }) ||
			ns.getOwnedSourceFiles().includes({ n: 8, lvl: 3 })
	}

	private static buyShares(ns: NS, stocks: Stock[]): void {
		for (const stock of stocks) {

			const budget: number = StockManager.getBudget(ns, stocks)

			// Just stop if we can't buy any stocks
			if (budget < MINIMUM_MONEY_TO_INVEST) break

			// Skip over this stock if we can't buy any more shares
			if (stock.hasMaxShares()) continue

			if (stock.stockInformation.expectedReturn <= EXPECTED_RETURN_BUY_THRESHOLD) continue

			const remainingShares: number = stock.stockInformation.maxShares - stock.stockInformation.ownedLong - stock.stockInformation.ownedShort

			// TODO: Refactor this below

			if (!StockManager.hasShortAccess(ns)) {
				const purchasableShares: number = Math.max(0, Math.min(remainingShares, Math.floor(budget / stock.stockInformation.askPrice)))

				if (purchasableShares) {
					if (purchasableShares * stock.stockInformation.expectedReturn * stock.stockInformation.price < 2 * STOCK_COMMISSION)
						continue

					stock.buyLongs(ns, purchasableShares)
				}
			} else {
				if (stock.position === StockPosition.LONG) {
					const purchasableShares: number = Math.max(0, Math.min(remainingShares, Math.floor(budget / stock.stockInformation.askPrice)))
					if (purchasableShares) {
						stock.buyLongs(ns, purchasableShares)
					}
				} else {
					const purchasableShares: number = Math.max(0, Math.min(remainingShares, Math.floor(budget / stock.stockInformation.bidPrice)))
					if (purchasableShares) {
						stock.buyShorts(ns, purchasableShares)
					}
				}
			}


		}
	}

	private static sellUnderperforming(ns: NS, stocks: Stock[]): number {
		const soldStocks: Stock[] = []

		let totalProfit: number = 0

		for (const stock of stocks) {

			// TODO: Check the conditions for selling (especially when making a loss)

			if (stock.stockInformation.ownedShort) {

				if (stock.stockInformation.expectedReturn > EXPECTED_RETURN_SELL_THRESHOLD) continue

				const potentialProfit: number = stock.stockInformation.ownedShort * (stock.stockInformation.averageShortPrice - stock.stockInformation.askPrice)

				// Only sell if we would make a profit
				if (potentialProfit > 2 * STOCK_COMMISSION) {
					totalProfit += stock.sellShorts(ns)
					soldStocks.push(stock)
				}
			}

			if (stock.stockInformation.ownedLong) {

				if (stock.stockInformation.expectedReturn > EXPECTED_RETURN_SELL_THRESHOLD) continue

				const potentialProfit: number = stock.stockInformation.ownedLong * (stock.stockInformation.bidPrice - stock.stockInformation.averageLongPrice)

				// Only sell if we would make a profit
				if (potentialProfit > 2 * STOCK_COMMISSION) {
					totalProfit += stock.sellLongs(ns)
					soldStocks.push(stock)
				}
			}

		}

		soldStocks.forEach((soldStock) => {
			const index: number = stocks.findIndex((stock) => stock.symbol === soldStock.symbol)
			if (index === -1) return // It was already removed
			else stocks.splice(index, 1)
		})

		return totalProfit

	}

	private static sellIncorrectPositions(ns: NS, stocks: Stock[]): number {
		const soldStocks: Stock[] = []
		let totalProfit: number   = 0
		for (const stock of stocks) {
			if (stock.position === StockPosition.LONG && stock.stockInformation.ownedShort) {
				totalProfit += stock.sellShorts(ns)
				soldStocks.push(stock)
			}

			if (stock.position === StockPosition.SHORT && stock.stockInformation.ownedLong) {
				totalProfit += stock.sellLongs(ns)
				soldStocks.push(stock)
			}
		}

		soldStocks.forEach((soldStock) => {
			const index: number = stocks.findIndex((stock) => stock.symbol === soldStock.symbol)
			if (index === -1) return // It was already removed
			else stocks.splice(index, 1)
		})

		return totalProfit
	}

	private static updateStocks(ns: NS, stocks: Stock[]): void {
		stocks.forEach((stock) => stock.update(ns))
	}

	public async initialize(ns: NS) {
		Utils.disableLogging(ns)

		ns.atExit(this.destroy.bind(this, ns))

		this.stocks = Stock.getStocks(ns)

		this.startingCorpus = this.stocks.reduce((total, stock) => total + stock.getStockCorpus(), 0)
	}

	public async start(ns: NS): Promise<void> {
		LogAPI.printTerminal(ns, `Starting the StockManager`)

		LogAPI.printLog(ns, `Starting corpus value of ${ns.nFormat(this.startingCorpus, '$0.000a')}`)

		this.managingLoopTimeout = setTimeout(this.managingLoop.bind(this, ns), LOOP_DELAY)
	}

	public async destroy(ns: NS): Promise<void> {
		if (this.managingLoopTimeout) clearTimeout(this.managingLoopTimeout)

		// TODO: Do we want to do this?

		/*
		 this.stocks.forEach((stock) => {
		 stock.update(ns)
		 stock.sellAll(ns)
		 })
		 */

		LogAPI.printTerminal(ns, `Stopping the StockManager`)
	}

	private async managingLoop(ns: NS): Promise<void> {

		StockManager.updateStocks(ns, this.stocks)

		this.stocks.sort((a, b) => {
			if (b.stockInformation.expectedReturn === a.stockInformation.expectedReturn) {
				return Math.abs(b.stockInformation.probability) - Math.abs(a.stockInformation.probability)
			}

			return b.stockInformation.expectedReturn - a.stockInformation.expectedReturn
		})


		const ownedStocks: Stock[] = this.stocks.filter((stock) => stock.hasShares())

		const corpus: number = ownedStocks.reduce((total, stock) => total + stock.getStockCorpus(), 0)
		if (corpus !== this.lastCorpus) {
			this.lastCorpus = corpus
			LogAPI.printLog(ns, `Holding ${ownedStocks.length} stocks (of ${this.stocks.length} total stocks). Total corpus value of ${ns.nFormat(corpus, '$0.000a')}`)
		}

		// We update the ownedStocks in-place in the coming function calls

		this.runningProfit += StockManager.sellUnderperforming(ns, ownedStocks)

		if (StockManager.hasShortAccess(ns)) {
			this.runningProfit += StockManager.sellIncorrectPositions(ns, ownedStocks)
		}

		StockManager.buyShares(ns, this.stocks)

		if (this.runningProfit !== this.lastRunningProfit) {
			this.lastRunningProfit = this.runningProfit
			LogAPI.printLog(ns, this.runningProfit > 0 ? `Total profit so far: ${ns.nFormat(this.runningProfit, '$0.000a')}` : `Total loss so far: ${ns.nFormat(-this.runningProfit, '$0.000a')}}`)
		}

		this.managingLoopTimeout = setTimeout(this.managingLoop.bind(this, ns), LOOP_DELAY)
	}

}

export async function main(ns: NS) {
	if (ns.getHostname() !== 'home') {
		throw new Error('Run the script from home')
	}

	const instance: StockManager = new StockManager()

	await instance.initialize(ns)
	await instance.start(ns)

	while (true) {
		await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL)
	}
}