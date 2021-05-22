import { CONSTANT } from '/src/lib/constants.js';
const files = [
    'Bitburner.t.js',
    'import.js',
    'classes/ExternalServer.js',
    'classes/HackableServer.js',
    'classes/HomeServer.js',
    'classes/Program.js',
    'classes/PurchasedServer.js',
    'classes/Server.js',
    'lib/constants.js',
    'managers/HackManager.js',
    'managers/PlayerManager.js',
    'managers/ProgramManager.js',
    'managers/ServerManager.js',
    'scripts/cleanHome.js',
    'scripts/daemon.js',
    'scripts/spider.js',
    'subscripts/grow.js',
    'subscripts/hack.js',
    'subscripts/weaken.js',
];
/*
 * This will import all files listed in importFiles.
 */
export async function main(ns) {
    let filesImported = await importFiles(ns);
    ns.tprint('='.repeat(20));
    if (filesImported) {
        ns.tprint('You have succesfully downloaded the scripts.');
        ns.tprint(`You have installed these in the ${CONSTANT.LOCAL_FOLDER} directory.`);
    }
    else {
        ns.tprint('You had some issues downloading files, please check your scripts and config.');
    }
}
async function importFiles(ns) {
    if (!files) {
        throw Error("No files found.");
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
