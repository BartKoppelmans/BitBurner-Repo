import type { BitBurner as NS } from "Bitburner";
import Crime from "/src/classes/Crime.js";
import { CONSTANT } from "/src/lib/constants.js";
import * as CrimeUtils from "/src/util/CrimeUtils.js";
import * as LogAPI from "/src/api/LogAPI.js";
import { LogMessageCode } from "/src/interfaces/PortMessageInterfaces.js";

export async function main(ns: NS) {

    if (ns.isBusy()) {
        await LogAPI.log(ns, "Cannot execute crimes, we are currently busy.", true, LogMessageCode.WARNING);
        return;
    }

    let crimes: Crime[] = CrimeUtils.getCrimes(ns);
    let isCancelled: boolean = false;

    await LogAPI.log(ns, "Executing crimes", true, LogMessageCode.INFORMATION);
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
        crimes = crimes.sort((a, b) => b.crimeValue! - a.crimeValue!);

        const nextCrime: Crime = crimes[0];

        nextCrime.commit(ns);

        const cancelButton = document.getElementById("work-in-progress-cancel-button");

        if (cancelButton) {
            cancelButton.addEventListener("click", () => {
                isCancelled = true;
                ns.exit();
            });
        }

        await ns.sleep(nextCrime.crimeStats.time);
    }
}