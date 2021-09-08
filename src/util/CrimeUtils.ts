import type { BitBurner as NS, Crime as CrimeName } from 'Bitburner'
import Crime                                        from '/src/classes/Misc/Crime.js'

export function getCrimes(ns: NS): Crime[] {
	const crimeNames: CrimeName[] = ['Shoplift', 'Rob Store', 'Mug', 'Larceny', 'Deal Drugs', 'Bond Forgery', 'Traffick Arms', 'Homicide', 'Grand Theft Auto', 'Kidnap', 'Assassinate', 'Heist']
	return crimeNames.map((crimeName) => new Crime(ns, crimeName))
}