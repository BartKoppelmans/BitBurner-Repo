const possibleNameVowels = ['e', 'e', 'e', 'e', 'e', 'e', 'ee', 'ee', 'ee', 'ea'];
const possibleNameEndings = ['ve'];
const oneConsonantStarts = [
    '',
    'm', 'mh',
    'n', 'gn', 'kn', 'mn', 'pn',
    'p',
    'b', 'bh',
    't', 'pt',
    'd', 'dh',
    'c', 'k', 'kh', 'q',
    'g', 'gh',
    's', 'c', 'ps', 'sc',
    'z', 'cz', 'ts', 'tz', 'x',
    'sh', 'sch',
    'zh',
    'f', 'ph',
    'v',
    'th', 'chth', 'phth',
    'y',
    'h',
    'rh', 'wr',
    'l',
    'w', 'ou',
    'wh', 'ch', 'cz', 'tch', 'tsh', 'tzsch',
    'j',
    'x',
];
const twoConsonantClusters = [
    'sm',
    'sn',
    'st',
    'sw',
    'sk',
    'sl',
    'sp',
    'sf',
    'θw',
    'dw',
    'tw',
    'θr',
    'dr',
    'tr',
    'kw',
    'kr',
    'kl',
    'pr',
    'fr',
    'br',
    'gr',
    'pl',
    'fl',
    'bl',
    'gl',
    'ʃr',
];
const threeConsonantClusters = [
    'spl',
    'spr',
    'str',
    'sfr',
    'skr',
    'skw',
    'sqw',
];
const consonantSubstitutions = {
    'θ': ['th'],
    'f': ['f', 'ph'],
    'ʃ': ['sh', 'sch'],
};
// https://stackoverflow.com/a/57015870/3586848
function combine([head, ...[headTail, ...tailTail]]) {
    if (!headTail)
        return head;
    const combined = headTail.reduce((acc, x) => acc.concat(head.map(h => `${h}${x}`)), []);
    return combine([combined, ...tailTail]);
}
function substituteConsonants(clusters, substitutions) {
    return clusters.map((cluster) => {
        return combine(cluster
            .split('')
            .map((letter) => substitutions[letter] ? substitutions[letter] : [letter])
            .flat());
    });
}
const twoConsonantClustersWithSubstitutions = substituteConsonants(twoConsonantClusters, consonantSubstitutions);
const three_consonant_clusters_with_substitutions = substitute_consonants(three_consonant_clusters, consonant_substitutions);
const starts = one_consonant_starts
    .concat(two_consonant_clusters_with_substitutions)
    .concat(three_consonant_clusters_with_substitutions);
function getRandomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}
export const getRandomSteve;
() => {
    return `${sample(starts)}${sample(possible_name_vowels)}${sample(possible_name_endings)}`;
};
