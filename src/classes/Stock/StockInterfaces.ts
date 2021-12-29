import Stock from '/src/classes/Stock/Stock'

export type StockPosition = [sharesLong: number, averagePriceLong: number, sharesShort: number, averagePriceShort: number]

export interface StockMap {
	lastUpdated: Date;
	stocks: Stock[];
	marketCycleDetected: boolean,
	cycleTick: number,
}

export type StockInformationDict = { [symbol: string]: StockInformation }
export type StockForecastDict = { [symbol: string]: StockForecastInformation }
export type StockInversionDict = { [symbol: string]: boolean }

export type DetectCycleTickResult = { hasTicked: boolean, predictedCycleTick?: number }

export interface StockPurchase {
	type: 'long' | 'short',
	ticksHeld: number,
	numShares: number
	price: number
}

export interface StockSale {
	type: 'long' | 'short',
	ticksHeld: number,
	numShares: number
	money: number // The received amount of money
	profit: number // The profit we made
}

export interface StockInformation {
	// NOTE: These should be calculated
	maxShares: number;
	ownedShares: number;
	sharesLong: number
	sharesShort: number

	priceInformation: StockPriceInformation

	position: StockPosition

	purchases: StockPurchase[]
}

export interface StockPriceInformation {
	askPrice: number
	bidPrice: number;
	spread: number;
	spreadPercentage: number
	price: number

	boughtPrice?: number
	boughtPriceShort?: number
}


export interface StockForecastInformation {
	volatility: number
	probability: number;

	tools: StockForecastTools
}

export interface ManualStockForecastInformation extends StockForecastInformation {
	probabilitySigma: number;

	tools: ManualStockForecastTools
}

export interface StockForecastTools {
	lastTickProbability: number
	lastInversion: number;
}

export interface ManualStockForecastTools extends StockForecastTools {
	nearTermForecast: number
	longTermForecast: number
}