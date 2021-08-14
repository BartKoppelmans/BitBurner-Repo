const excludedFiles = [
    '/src/lib/constants.js',
    'import.js',
    'augmenthelper.js',
    'buyNeuroFLux.js',
    'karma.js',
];
const excludedExtensions = [
    'lit',
    'msg',
    'script',
    'exe',
];
export async function main(ns) {
    const host = ns.getHostname();
    if (host !== 'home') {
        throw new Error('Execute script from home.');
    }
    const files = ns.ls(host)
        .filter(file => !excludedFiles.includes(file))
        .filter(file => {
        const extension = file.split('.').pop();
        if (!extension) {
            return true;
        }
        return !excludedExtensions.includes(extension);
    });
    files.forEach(file => ns.rm(file));
}
