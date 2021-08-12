import type { BitBurner as NS } from 'Bitburner'
import Crime                    from '/src/classes/Crime.js'
import { CONSTANT }             from '/src/lib/constants.js'
import * as CrimeUtils          from '/src/util/CrimeUtils.js'
import * as LogAPI              from '/src/api/LogAPI.js'
import { LogType }              from '/src/interfaces/LogInterfaces.js'

export async function main(ns: NS) {

	if (ns.isBusy()) {
		LogAPI.log(ns, 'Cannot execute crimes, we are currently busy.', LogType.WARNING)
		return
	}

	const useHomicide: boolean = (ns.args[0] === 'true' || ns.args[0] === 'True')

	let crimes: Crime[]      = CrimeUtils.getCrimes(ns)
	let isCancelled: boolean = false

	LogAPI.log(ns, 'Executing crimes', LogType.INFORMATION)
	while (!isCancelled) {
		if (ns.isBusy()) {
			await ns.sleep(CONSTANT.CRIME_DELAY)
			continue
		}

		let crime: Crime = crimes.find((c) => c.name === 'homicide') as Crime

		if (!useHomicide) {
			// Evaluate the potential crimes afterwards
			await Promise.all(crimes.map(async (c) => {
				return c.evaluate(ns)
			}))

			// Sort the potential crimes
			crimes = crimes.sort((a, b) => b.crimeValue! - a.crimeValue!)

			crime = crimes[0]
		}


		crime.commit(ns)

		const cancelButton = document.getElementById('work-in-progress-cancel-button')

		if (cancelButton) {
			cancelButton.addEventListener('click', () => {
				isCancelled = true
				ns.exit()
			})
		}

		await ns.sleep(crime.crimeStats.time)
	}
}