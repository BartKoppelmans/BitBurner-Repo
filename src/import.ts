import type { BitBurner as NS } from "Bitburner";
import { CONSTANT } from '/src/lib/constants.js';

const files: string[] = [
    'Bitburner.t.js',
    'import.js',
    'api/ProgramAPI.js',
    'api/PurchasedServerAPI.js',
    'api/ServerAPI.js',
    'classes/BatchJob.js',
    'classes/HackableServer.js',
    'classes/HomeServer.js',
    'classes/Job.js',
    'classes/Program.js',
    'classes/PurchasedServer.js',
    'classes/Server.js',
    'interfaces/JobInterfaces.js',
    'interfaces/PortMessageInterfaces.js',
    'interfaces/ServerInterfaces.js',
    'lib/constants.js',
    'managers/JobManager.js',
    'managers/PlayerManager.js',
    'managers/ProgramManager.js',
    'managers/PurchasedServerManager.js',
    'managers/ServerManager.js',
    'scripts/cleanHome.js',
    'scripts/daemon.js',
    'scripts/killAll.js',
    'tools/grow.js',
    'tools/hack.js',
    'tools/Tools.js',
    'tools/weaken.js',
    'util/BatchJobUtils.js',
    'util/HackUtils.js',
    'util/Heuristics.js',
    'util/JobUtils.js',
    'util/ProgramManagerUtils.js',
    'util/PurchasedServerManagerUtils.js',
    'util/ServerHackUtils.js',
    'util/ServerManagerUtils.js',
    'util/ServerUtils.js',
    'util/ToolUtils.js',
    'util/Utils.js',
];

/*
 * This will import all files listed in importFiles.
 */
export async function main(ns: NS) {

    let filesImported = await importFiles(ns);
    ns.tprint('='.repeat(20));
    if (filesImported) {
        ns.tprint('You have succesfully downloaded the scripts.');
        ns.tprint(`You have installed these in the ${CONSTANT.LOCAL_FOLDER} directory.`);
    } else {
        ns.tprint(
            'You had some issues downloading files, please check your scripts and config.'
        );
    }
}

async function importFiles(ns: NS) {
    if (!files) {
        throw new Error("No files found.");
    }

    let filesImported = true;
    for (let file of files) {
        let remoteFileName = `${CONSTANT.ROOT_URL}/${CONSTANT.REMOTE_FOLDER}/${file}`;
        let result = await ns.wget(remoteFileName, `/${CONSTANT.LOCAL_FOLDER}/${file}`);
        filesImported = filesImported && result;
        ns.tprint(`File: ${file}: ${result ? '✔️' : '❌'}`);
    }

    return filesImported;
}