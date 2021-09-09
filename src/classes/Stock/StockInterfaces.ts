export enum StockPosition {
	SHORT = 'Short',
	LONG  = 'Long',
}

export interface StockInformation {
	volatility: number;
	probability: number;
	maxShares: number;
	askPrice: number;
	bidPrice: number
	expectedReturn: number

	ownedLong: number;
	averageLongPrice: number

	ownedShort: number;
	averageShortPrice: number
}