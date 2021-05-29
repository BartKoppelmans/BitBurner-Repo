export const CONSTANT = {

    /*
     * General constants
     */
    MILLISECONDS_IN_SECOND: 1000,

    SMALL_DELAY: 50,

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

    // The name of the darkweb server
    DARKWEB_HOST: "darkweb",

    HOME_SERVER_HOST: "home",

    DESIRED_MONEY_RATIO: 0.9,
    MIN_SECURITY_LEVEL_OFFSET: 1,
    DESIRED_FREE_RAM_RATIO: 0.05,

    /*
    * Server manager constants
    */

    // The time after which we force a rebuild of the server map (now 1 hour)
    SERVER_MAP_REBUILD_TIME: 60 * 60 * 1000,

    // The oldest date possible, to ensure a rebuild of the server map
    EPOCH_DATE: new Date(1970, 0, 1, 0, 0, 0, 0),

    /* 
     * Hacking manager constants
     */
    MAX_TARGET_COUNT: 10,

    HACK_LOOP_DELAY: 1 * 1000,

    ALLOW_THREAD_SPREADING: true,

    MAX_CYCLE_NUMBER: 25,

    // Max server growth rate, higher than this will be throttled
    MAX_GROWTH_RATE: 1.0035,

    // Unadjusted server growth rate, this is higher than actually possible
    UNADJUSTED_GROWTH_RATE: 1.03,

    HACK_PERCENTAGE: 0.5,

    // Currently set to 12 seconds
    QUEUE_DELAY: 12000,

    CYCLE_DELAY: 3000,

    // THe amount that each operation changes the security level of the server
    WEAKEN_POTENCY: 0.05,
    HACK_HARDENING: 0.002,
    GROW_HARDENING: 0.004,



} as const;