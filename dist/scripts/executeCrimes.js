import { CONSTANT } from "/src/lib/constants.js";
import * as CrimeUtils from "/src/util/CrimeUtils.js";
import * as Utils from "/src/util/Utils.js";
export async function main(ns) {
    if (ns.isBusy()) {
        Utils.tprintColored("Cannot execute crimes, we are currently busy.", true, CONSTANT.COLOR_WARNING);
        return;
    }
    let crimes = CrimeUtils.getCrimes(ns);
    let isCancelled = false;
    Utils.tprintColored("Executing crimes", true, CONSTANT.COLOR_INFORMATION);
    while (!isCancelled) {
        if (ns.isBusy()) {
            await ns.sleep(CONSTANT.CRIME_DELAY);
            continue;
        }
        // Evaluate the potential crimes afterwards
        await Promise.all(crimes.map(async (crime) => {
            crime.evaluate(ns);
        }));
        // Sort the potential crimes
        crimes = crimes.sort((a, b) => b.crimeValue - a.crimeValue);
        const nextCrime = crimes[0];
        nextCrime.commit(ns);
        const cancelButton = document.getElementById("work-in-progress-cancel-button");
        cancelButton?.addEventListener("click", () => {
            isCancelled = true;
        });
        await ns.sleep(nextCrime.crimeStats.time);
    }
}
