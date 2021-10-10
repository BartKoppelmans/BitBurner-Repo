import type { BitBurner as NS }  from 'Bitburner'
import { hasManagerKillRequest } from '/src/api/ControlFlowAPI.js'
import * as LogAPI               from '/src/api/LogAPI.js'
import * as Utils                from '/src/util/Utils.js'
import * as PlayerUtils          from '/src/util/PlayerUtils.js'
import { Manager }               from '/src/classes/Misc/ScriptInterfaces.js'
import { CONSTANT }              from '/src/lib/constants.js'
import Stock                     from '/src/classes/Stock/Stock.js'
import { StockPosition }         from '/src/classes/Stock/StockInterfaces.js'

const LOOP_DELAY: number                = 1000 as const
const STOCK_ALLOWANCE: number           = 0.05 as const
const STOCK_COMMISSION: number          = 100000 as const
const MINIMUM_MONEY_TO_INVEST: number   = 10 * STOCK_COMMISSION
const EXPECTED_RETURN_THRESHOLD: number = 0.0002 as const // Buy anything forecasted to earn better than a 0.02% return

class StockManager implements Manager {

	private managingLoopTimeout?: ReturnType<typeof setTimeout>
	private stocks: Stock[]        = []
	private startingCorpus: number = 0

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

			if (stock.stockInformation.expectedReturn <= EXPECTED_RETURN_THRESHOLD) continue

			const remainingShares: number = stock.stockInformation.maxShares - stock.stockInformation.ownedLong - stock.stockInformation.ownedShort
			if (stock.position === StockPosition.LONG) {
				const purchasableShares: number = Math.max(0, Math.min(remainingShares, Math.floor(budget / stock.stockInformation.askPrice)))
				if (purchasableShares) {
					stock.buyLongs(ns, purchasableShares)
				}
			} else {
				if (!StockManager.hasShortAccess(ns)) continue

				const purchasableShares: number = Math.max(0, Math.min(remainingShares, Math.floor(budget / stock.stockInformation.bidPrice)))
				if (purchasableShares) {
					stock.buyShorts(ns, purchasableShares)
				}
			}
		}
	}

	private static sellUnderperforming(ns: NS, stocks: Stock[]): void {
		const soldStocks: Stock[] = []

		for (const stock of stocks) {

			if (stock.stockInformation.ownedShort) {
				const potentialProfit: number = stock.stockInformation.ownedShort * (stock.stockInformation.averageShortPrice - stock.stockInformation.askPrice)

				if (potentialProfit > 2 * STOCK_COMMISSION) {
					stock.sellShorts(ns)
					soldStocks.push(stock)
				}
			}

			if (stock.stockInformation.ownedLong) {
				const potentialProfit: number = stock.stockInformation.ownedLong * (stock.stockInformation.bidPrice - stock.stockInformation.averageLongPrice)

				if (potentialProfit > 2 * STOCK_COMMISSION) {
					stock.sellLongs(ns)
					soldStocks.push(stock)
				}
			}

		}

		soldStocks.forEach((soldStock) => {
			const index: number = stocks.findIndex((stock) => stock.symbol === soldStock.symbol)
			if (index === -1) return // It was already removed
			else stocks.splice(index, 1)
		})

	}

	private static sellIncorrectPositions(ns: NS, stocks: Stock[]): void {
		const soldStocks: Stock[] = []
		for (const stock of stocks) {
			if (stock.position === StockPosition.LONG && stock.stockInformation.ownedShort) {
				stock.sellShorts(ns)
				soldStocks.push(stock)
			}

			if (stock.position === StockPosition.SHORT && stock.stockInformation.ownedLong) {
				stock.sellLongs(ns)
				soldStocks.push(stock)
			}
		}

		soldStocks.forEach((soldStock) => {
			const index: number = stocks.findIndex((stock) => stock.symbol === soldStock.symbol)
			if (index === -1) return // It was already removed
			else stocks.splice(index, 1)
		})

	}

	private static updateStocks(ns: NS, stocks: Stock[]): void {
		stocks.forEach((stock) => stock.update(ns))
	}

	public async initialize(ns: NS) {
		Utils.disableLogging(ns)

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

		// TODO: Sell all stocks
		this.stocks.forEach((stock) => {
			stock.update(ns)
			stock.sellAll(ns)
		})

		LogAPI.printTerminal(ns, `Stopping the StockManager`)
	}

	private async managingLoop(ns: NS): Promise<void> {
		let corpus: number = this.stocks.reduce((total, stock) => total + stock.getStockCorpus(), 0)
		LogAPI.printLog(ns, `Total corpus value of ${ns.nFormat(corpus, '$0.000a')} before transactions`)

		StockManager.updateStocks(ns, this.stocks)

		this.stocks.sort((a, b) => {
			if (b.stockInformation.expectedReturn === a.stockInformation.expectedReturn) {
				return Math.abs(b.stockInformation.probability) - Math.abs(a.stockInformation.probability)
			}

			return b.stockInformation.expectedReturn - a.stockInformation.expectedReturn
		})


		const ownedStocks: Stock[] = this.stocks.filter((stock) => stock.hasShares())

		// We update the ownedStocks in-place in the coming function calls

		StockManager.sellUnderperforming(ns, ownedStocks)

		if (StockManager.hasShortAccess(ns)) {
			StockManager.sellIncorrectPositions(ns, ownedStocks)
		}


		StockManager.buyShares(ns, this.stocks)

		corpus = this.stocks.reduce((total, stock) => total + stock.getStockCorpus(), 0)
		LogAPI.printLog(ns, `Total corpus value of ${ns.nFormat(corpus, '$0.000a')} after transactions`)

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

	while (!hasManagerKillRequest(ns)) {
		await ns.sleep(CONSTANT.CONTROL_FLOW_CHECK_INTERVAL)
	}

	await instance.destroy(ns)
}