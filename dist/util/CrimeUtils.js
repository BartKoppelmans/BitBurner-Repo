import Crime from "/src/classes/Crime.js";
export function getCrimes(ns) {
    const crimeNames = ["shoplift", "rob store", "mug", "larceny", "deal drugs", "bond forgery", "traffick arms", "homicide", "grand theft auto", "kidnap", "assassinate", "heist"];
    return crimeNames.map((crimeName) => new Crime(ns, crimeName));
}
