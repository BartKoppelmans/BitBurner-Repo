import { CONSTANT } from '/src/lib/constants.js';
import * as CrimeUtils from '/src/util/CrimeUtils.js';
import * as LogAPI from '/src/api/LogAPI.js';
export async function main(ns) {
    if (ns.isBusy()) {
        LogAPI.warn(ns, 'Cannot execute crimes, we are currently busy.');
        return;
    }
    const flags = ns.flags([
        ['homicide', false],
        ['experience', false],
    ]);
    if (flags.homicide && flags.experience)
        throw new Error('Unable to  force \'homicide\' and optimize for experience at the same time.');
    let crimes = CrimeUtils.getCrimes(ns);
    let isCancelled = false;
    while (!isCancelled) {
        if (ns.isBusy()) {
            await ns.sleep(CONSTANT.CRIME_DELAY);
            continue;
        }
        let crime;
        if (flags.homicide)
            crime = crimes.find((c) => c.name === 'Homicide');
        else {
            // Evaluate the potential crimes afterwards
            await Promise.all(crimes.map(async (c) => {
                return c.evaluate(ns, flags.experience);
            }));
            // Sort the potential crimes
            crimes = crimes.sort((a, b) => b.crimeValue - a.crimeValue);
            crime = crimes[0];
        }
        crime.commit(ns);
        const cancelButton = eval('document').getElementById('work-in-progress-cancel-button');
        if (cancelButton) {
            cancelButton.addEventListener('click', () => {
                isCancelled = true;
                ns.exit();
            });
        }
        await ns.sleep(crime.crimeStats.time);
    }
}
