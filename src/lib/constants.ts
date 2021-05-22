export const CONSTANT = {

    /*
     * Import script constants
     */

    // The local folder where files should be stored on BitBurner
    LOCAL_FOLDER: "src",

    // The remote folder where BitBurner gets its files (from GitHub)
    REMOTE_FOLDER: "dist",

    // The URL on GitHub to import from
    ROOT_URL: "https://raw.githubusercontent.com/BartKoppelmans/BitBurner-Repo/master",


    /*
     * Server constants
     */

    // The prefix that is used when purchasing external servers
    PURCHASED_SERVER_PREFIX: "BartServer-",

    /*
    * Server manager constants
    */

    // The time after which we force a rebuild of the server map (now 1 hour)
    SERVER_MAP_REBUILD_TIME: 60 * 60 * 1000,

    // The oldest date possible, to ensure a rebuild of the server map
    EPOCH_DATE: new Date(1970, 0, 1, 0, 0, 0, 0)



} as const;