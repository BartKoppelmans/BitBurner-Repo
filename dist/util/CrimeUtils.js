import Crime from '/src/classes/Misc/Crime.js';
export function getCrimes(ns) {
    const crimeNames = ['Shoplift', 'Rob Store', 'Mug', 'Larceny', 'Deal Drugs', 'Bond Forgery', 'Traffick Arms', 'Homicide', 'Grand Theft Auto', 'Kidnap', 'Assassinate', 'Heist'];
    return crimeNames.map((crimeName) => new Crime(ns, crimeName));
}
