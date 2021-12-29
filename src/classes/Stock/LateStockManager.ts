/*
 CREDITS: This script was heavily influenced by the amazing work of @Insight.
 */

import type { NS }                  from 'Bitburner'
import * as LogAPI                  from '/src/api/LogAPI.js'
import { StockForecastInformation } from '/src/classes/Stock/StockInterfaces.js'
import Stock                        from '/src/classes/Stock/Stock.js'
import BaseStockManager             from '/src/classes/Stock/BaseStockManager.js'


const BUY_RETURN_THRESHOLD: number  = 0.0001 as const
const SELL_RETURN_THRESHOLD: number = 0 as const

export default class LateStockManager extends BaseStockManager {

	has4s: boolean = true

	public async initialize(ns: NS) {
		await super.initialize(ns)
	}

	public async start(ns: NS): Promise<void> {
		await super.start(ns)
		LogAPI.printTerminal(ns, `Starting the LateStockManager`)
	}

	public async destroy(ns: NS): Promise<void> {
		await super.destroy(ns)
		LogAPI.printTerminal(ns, `Stopping the LateStockManager`)
	}

	public async managingLoop(ns: NS): Promise<void> {
		await super.managingLoop(ns)

		// TODO: Any specific things
	}

	protected preDetectPossibleInversion(ns: NS, stock: Stock): boolean {
		const probability: number = ns.stock.getForecast(stock.symbol)
		return BaseStockManager.detectInversion(probability, stock.stockForecastInformation.probability || probability) // TODO: We should not refer back to the base stock manager
	}

	protected verifyStockInversion(ns: NS): boolean {
		return this.stockStorage.cycleTick === 0
	}

	protected calculateStockForecastInformation(ns: NS, stock: Stock): StockForecastInformation {
		const volatility: number  = ns.stock.getVolatility(stock.symbol)
		const probability: number = ns.stock.getForecast(stock.symbol)

		// TODO: Read these values from files if we have them, otherwise use a runner
		return {
			volatility,
			probability,
			tools: {
				lastTickProbability: stock.stockForecastInformation?.probability || 0,
				lastInversion: stock.stockForecastInformation?.tools?.lastInversion || 0,
			},
		}
	}

	protected getSellThreshold(): number {
		return SELL_RETURN_THRESHOLD
	}
}