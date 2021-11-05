import type { NS } from 'Bitburner'
import Crime       from '/src/classes/Misc/Crime.js'

export function getCrimes(ns: NS): Crime[] {
	const crimeNames: string[] = ['shoplift', 'rob store', 'mug', 'larceny', 'deal drugs', 'bond forgery', 'traffick arms', 'homicide', 'grand theft auto', 'kidnap', 'assassinate', 'heist']
	return crimeNames.map((crimeName) => new Crime(ns, crimeName))
}