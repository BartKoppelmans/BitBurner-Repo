import config from '/src/config/import_config.js';
const files = [
    "Bitburner.t.js",
    "import.js",
    "classes/ExternalServer.js",
    "classes/HackableServer.js",
    "classes/HomeServer.js",
    "classes/PurchasedServer.js",
    "classes/Server.js",
    "config/import_config.js",
    "config/server_config.js",
    "managers/ServerManager.js",
    "scripts/hack.js",
    "scripts/spider.js",
    "scripts/start_hacking.js",
    "util/util.js"
];
/*
 * This will import all files listed in importFiles.
 */
export async function main(ns) {
    let filesImported = await importFiles(ns);
    ns.tprint('='.repeat(20));
    if (filesImported) {
        ns.tprint('You have succesfully downloaded the scripts.');
        ns.tprint(`You have installed these in the ${getLocalFolder()} directory.`);
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
        let remoteFileName = `${config.rootUrl}/${getRemoteFolder()}/${file}`;
        let result = await ns.wget(remoteFileName, `/${getLocalFolder()}/${file}`);
        filesImported = filesImported && result;
        ns.tprint(`File: ${file}: ${result ? '✔️' : '❌'}`);
    }
    return filesImported;
}
// The folder where the file can be found on GitHub
export function getLocalFolder() {
    return config.local_folder;
}
// The folder where the file can be found on BitBurner
export function getRemoteFolder() {
    return config.remote_folder;
}
