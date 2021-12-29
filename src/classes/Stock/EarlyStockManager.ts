/*
 CREDITS: This script was heavily influenced by the amazing work of @Insight.
 */

import type { NS }                        from 'Bitburner'
import * as LogAPI                        from '/src/api/LogAPI.js'
import { ManualStockForecastInformation } from '/src/classes/Stock/StockInterfaces.js'
import Stock                              from '/src/classes/Stock/Stock.js'
import BaseStockManager                   from '/src/classes/Stock/BaseStockManager.js'
import { STOCK_CONSTANT }                 from '/src/classes/Stock/StockConstants.js'

const BUY_PROBABILITY_THRESHOLD: number = 0.15 as const
const BUY_RETURN_THRESHOLD: number      = 0.0015 as const
const SELL_RETURN_THRESHOLD: number     = 0.0008 as const

const INVERSION_LAG_TOLERANCE: number          = 5 as const
const LONG_TERM_FORECAST_WINDOW_LENGTH: number = 51 as const

const MINIMUM_HOLD_TIME: number       = 10 as const
const MINIMUM_BLACKOUT_WINDOW: number = 10 as const

export default class EarlyStockManager extends BaseStockManager {

	has4s: boolean = false

	public async initialize(ns: NS) {
		await super.initialize(ns)
	}

	public async start(ns: NS): Promise<void> {
		await super.start(ns)
		LogAPI.printTerminal(ns, `Starting the EarlyStockManager`)
	}

	public async destroy(ns: NS): Promise<void> {
		await super.destroy(ns)
		LogAPI.printTerminal(ns, `Stopping the EarlyStockManager`)
	}

	public async managingLoop(ns: NS): Promise<void> {
		await super.managingLoop(ns)

		// TODO: Any specific things
	}

	protected preDetectPossibleInversion(ns: NS, stock: Stock): boolean {
		const nearTermForecast: number    = EarlyStockManager.calculateForecast(stock.priceHistory.slice(0, STOCK_CONSTANT.NEAR_TERM_FORECAST_WINDOW_LENGTH))
		const preNearTermForecast: number = EarlyStockManager.calculateForecast(stock.priceHistory.slice(STOCK_CONSTANT.NEAR_TERM_FORECAST_WINDOW_LENGTH))
		return EarlyStockManager.detectInversion(preNearTermForecast, nearTermForecast)
	}

	protected verifyStockInversion(ns: NS): boolean {
		return (this.stockStorage.cycleTick > STOCK_CONSTANT.NEAR_TERM_FORECAST_WINDOW_LENGTH / 2 - 1) &&
			(this.stockStorage.cycleTick <= STOCK_CONSTANT.NEAR_TERM_FORECAST_WINDOW_LENGTH + INVERSION_LAG_TOLERANCE)
	}

	protected shouldBuy(stock: Stock): boolean {
		if (!super.shouldBuy(stock)) return false

		// Some extra checks in case we don't have the 4s
		if (Math.max(MINIMUM_HOLD_TIME, MINIMUM_BLACKOUT_WINDOW) >= this.stockStorage.getTicksUntilMarketCycle()) return false

		if (stock.stockForecastInformation.tools.lastInversion < STOCK_CONSTANT.PRICE_HISTORY_THRESHOLD) return false
		// TODO: PANIC, WE ARE USING AN IMPORTED CONST

		if (Math.abs(stock.stockForecastInformation.probability - 0.5) < BUY_PROBABILITY_THRESHOLD) return false
		return true
	}

	protected calculateStockForecastInformation(ns: NS, stock: Stock): ManualStockForecastInformation {

		// the largest observed % movement in a single tick
		const volatility: number = stock.priceHistory.reduce((max, price, idx) => Math.max(max, idx === 0 ? 0 : Math.abs(stock.priceHistory[idx - 1] - price) / price), 0)

		const probabilityWindowLength: number = Math.min(LONG_TERM_FORECAST_WINDOW_LENGTH, stock.stockForecastInformation?.tools?.lastInversion)

		const nearTermForecast: number = EarlyStockManager.calculateForecast(stock.priceHistory.slice(0, STOCK_CONSTANT.NEAR_TERM_FORECAST_WINDOW_LENGTH))
		const longTermForecast: number = EarlyStockManager.calculateForecast(stock.priceHistory.slice(0, probabilityWindowLength))

		return {

			volatility,
			probability: longTermForecast,

			probabilitySigma: Math.sqrt((longTermForecast * (1 - longTermForecast)) / probabilityWindowLength),
			tools: {
				lastTickProbability: stock.stockForecastInformation?.probability || 0,

				nearTermForecast,
				longTermForecast,

				lastInversion: stock.stockForecastInformation?.tools?.lastInversion || 0,
			},
		}
	}

	protected shouldSell(stock: Stock): boolean {
		return stock.stockInformation.purchases.some((purchase) => purchase.ticksHeld >= MINIMUM_HOLD_TIME)
	}

	protected getSellThreshold(): number {
		return SELL_RETURN_THRESHOLD
	}
}