import { CONSTANT } from '/src/lib/constants.js';
import * as CrimeUtils from '/src/util/CrimeUtils.js';
import * as LogAPI from '/src/api/LogAPI.js';
import { LogMessageCode } from '/src/interfaces/PortMessageInterfaces.js';
export async function main(ns) {
    if (ns.isBusy()) {
        await LogAPI.log(ns, 'Cannot execute crimes, we are currently busy.', true, LogMessageCode.WARNING);
        return;
    }
    const useHomicide = (ns.args[0] === 'true' || ns.args[0] === 'True');
    let crimes = CrimeUtils.getCrimes(ns);
    let isCancelled = false;
    await LogAPI.log(ns, 'Executing crimes', true, LogMessageCode.INFORMATION);
    while (!isCancelled) {
        if (ns.isBusy()) {
            await ns.sleep(CONSTANT.CRIME_DELAY);
            continue;
        }
        let crime = crimes.find((crime) => crime.name === 'homicide');
        if (!useHomicide) {
            // Evaluate the potential crimes afterwards
            await Promise.all(crimes.map(async (crime) => {
                crime.evaluate(ns);
            }));
            // Sort the potential crimes
            crimes = crimes.sort((a, b) => b.crimeValue - a.crimeValue);
            crime = crimes[0];
        }
        crime.commit(ns);
        const cancelButton = document.getElementById('work-in-progress-cancel-button');
        if (cancelButton) {
            cancelButton.addEventListener('click', () => {
                isCancelled = true;
                ns.exit();
            });
        }
        await ns.sleep(crime.crimeStats.time);
    }
}
