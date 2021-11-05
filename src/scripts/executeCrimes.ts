import type { NS }     from 'Bitburner'
import Crime           from '/src/classes/Misc/Crime.js'
import { CONSTANT }    from '/src/lib/constants.js'
import * as CrimeUtils from '/src/util/CrimeUtils.js'
import * as LogAPI     from '/src/api/LogAPI.js'

const MAX_NUM_ITERATIONS: number = 5 as const

function findCancelButton(ns: NS): HTMLButtonElement | null {
	const doc: Document = eval('document')
	const xpath         = '//button[text()=\'Cancel crime\']'
	return doc.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue as HTMLButtonElement | null
}

export async function main(ns: NS) {

	if (ns.isBusy()) {
		LogAPI.printTerminal(ns, 'Cannot execute crimes, we are currently busy.')
		return
	}

	// TODO: Change the homicide flag to set the crime to commit
	// This thing should be robust enough that casing etc don't matter

	const flags = ns.flags([
		['homicide', false],
		['experience', false],
	])

	if (flags.homicide && flags.experience) throw new Error('Unable to force \'homicide\' and optimize for experience at the same time.')

	let crimes: Crime[]               = CrimeUtils.getCrimes(ns)
	let isCancelled: boolean          = false
	let hasFoundCancelButton: boolean = false
	let iterations: number            = 0

	while (!isCancelled && (hasFoundCancelButton || iterations < MAX_NUM_ITERATIONS)) {
		if (ns.isBusy()) {
			await ns.asleep(CONSTANT.CRIME_DELAY)
			continue
		}

		let crime: Crime
		if (flags.homicide) crime = crimes.find((c) => c.name === 'homicide') as Crime
		else {
			// Evaluate the potential crimes afterwards
			await Promise.all(crimes.map(async (c) => {
				return c.evaluate(ns, flags.experience)
			}))

			// Sort the potential crimes
			crimes = crimes.sort((a, b) => b.crimeValue! - a.crimeValue!)

			crime = crimes[0]
		}

		crime.commit(ns)

		const cancelButton: HTMLButtonElement | null = findCancelButton(ns)

		if (cancelButton) {
			hasFoundCancelButton = true
			cancelButton.addEventListener('click', () => {
				isCancelled = true
				ns.exit()
			})
		} else {
			hasFoundCancelButton = false
			LogAPI.printTerminal(ns, `Could not find the cancel button, doing ${MAX_NUM_ITERATIONS - iterations} more iterations`)
		}

		await ns.asleep(crime.crimeStats.time)

		iterations++
	}
}