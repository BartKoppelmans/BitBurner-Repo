import config from 'config/import_config.js';
import token from 'config/github_token.js'

const files = [
    'start_hacking.js',
    'hack.js'
]

/*
 * This will import all files listed in importFiles.
 */
export async function main(ns) {
    let filesImported = await importFiles(ns);
    ns.tprint('='.repeat(20));
    if (filesImported) {
        ns.tprint('You have succesfully downloaded the scripts.');
        ns.tprint(`You have installed these in the ${config.folder} directory.`);
    } else {
        ns.tprint(
            'You had some issues downloading files, please check your scripts and config.'
        );
    }
}

async function importFiles(ns) {
    let filesImported = true;
    for (let file of files) {
        let remoteFileName = `${config.rootUrl}scripts/${file}`;
        let result = await ns.wget(remoteFileName, `/${getFolder()}/${file}?token=${token}`);
        filesImported = filesImported && result;
        ns.tprint(`File: ${file}: ${result ? '✔️' : '❌'}`);
    }
    return filesImported;
}

export function getFolder() {
    return config.folder;
}

export function getServerPrefix() {
    return config.serverPrefix;
}

export function getHackScript() {
    return `/${getFolder()}/hack.js`;
}