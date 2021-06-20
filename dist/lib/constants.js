export const CONSTANT = {
    /*
     * General constants
     */
    MILLISECONDS_IN_SECOND: 1000,
    SMALL_DELAY: 20,
    DEBUG_HACKING: false,
    COLOR_WARNING: "red",
    COLOR_HACKING: "white",
    COLOR_INFORMATION: "blue",
    /*
     * Import script constants
     */
    // The local folder where files should be stored on BitBurner
    LOCAL_FOLDER: "src",
    // The remote folder where BitBurner gets its files (from GitHub)
    REMOTE_FOLDER: "dist",
    // The URL on GitHub to import from
    ROOT_URL: "https://raw.githubusercontent.com/BartKoppelmans/BitBurner-Repo/master",
    SERVER_MAP_FILENAME: '/temp/servermap.txt',
    /*
     * Server constants
     */
    // The prefix that is used when purchasing external servers
    PURCHASED_SERVER_PREFIX: "BartServer-",
    // The name of the darkweb server
    DARKWEB_HOST: "darkweb",
    HOME_SERVER_HOST: "home",
    HOME_SERVER_ID: 0,
    DESIRED_MONEY_RATIO: 0.9,
    MIN_SECURITY_LEVEL_OFFSET: 1,
    DESIRED_HOME_FREE_RAM: 64,
    PURCHASE_PROGRAM_LOOP_INTERVAL: 60 * 1000,
    CHECK_PROGRAM_LOOP_INTERVAL: 10 * 1000,
    ROOT_LOOP_INTERVAL: 60 * 1000,
    SERVER_MESSAGE_INTERVAL: 100,
    MAX_SERVER_MESSAGE_WAIT: 5000,
    CONTRACT_CHECK_LOOP_INTERVAL: 10 * 1000,
    JOB_MANAGING_LOOP_INTERVAL: 100,
    JOB_REQUEST_LOOP_INTERVAL: 25,
    MAX_NUMBER_JOB_REQUESTS: 50,
    MAX_JOB_MESSAGE_WAIT: 5000,
    JOB_PORT_NUMBERS: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    CONTROL_FLOW_PORT: 20,
    JOB_MANAGER_REQUEST_PORT: 16,
    JOB_MANAGER_RESPONSE_PORT: 17,
    SERVER_MANAGER_REQUEST_PORT: 18,
    SERVER_MANAGER_RESPONSE_PORT: 19,
    CONTROL_FLOW_CHECK_INTERVAL: 1000,
    MAX_CONTROL_FLOW_MESSAGE_WAIT: 30 * 1000,
    PURCHASE_PURCHASED_SERVER_LOOP_INTERVAL: 60 * 1000,
    // Check if we can upgrade servers every 3 minutes
    UPGRADE_PURCHASED_SERVER_LOOP_INTERVAL: 60 * 1000,
    MIN_PURCHASED_SERVER_RAM_EXPONENT: 7,
    MAX_PURCHASED_SERVER_RAM_EXPONENT: 20,
    PURCHASED_SERVER_ALLOWANCE_PERCENTAGE: 0.01,
    HACKNET_ALLOWANCE_PERCENTAGE: 0.01,
    PURCHASED_SERVER_COST_PER_RAM: 55000,
    MAX_PURCHASED_SERVER_RAM: 1048576,
    MAX_PURCHASED_SERVERS: 25,
    /*
    * Server manager constants
    */
    // The time after which we force a rebuild of the server map (now 10 minutes)
    SERVER_MAP_REBUILD_INTERVAL: 60 * 1000,
    // The oldest date possible, to ensure a rebuild of the server map
    EPOCH_DATE: new Date(1970, 0, 1, 0, 0, 0, 0),
    /*
     * Hacking manager constants
     */
    // TODO: Change this back to 20 after early game.
    MAX_TARGET_COUNT: 20,
    HACK_LOOP_DELAY: 1000,
    ALLOW_THREAD_SPREADING: true,
    SERVER_UTILIZATION_THRESHOLD: 0.75,
    MAX_CYCLE_NUMBER: 100,
    // Max server growth rate, higher than this will be throttled
    MAX_GROWTH_RATE: 1.0035,
    // Unadjusted server growth rate, this is higher than actually possible
    UNADJUSTED_GROWTH_RATE: 1.03,
    DEFAULT_PERCENTAGE_TO_STEAL: 0.5,
    MIN_PERCENTAGE_TO_STEAL: 0.01,
    MAX_PERCENTAGE_TO_STEAL: 0.98,
    // Currently set to 12 seconds
    QUEUE_DELAY: 12000,
    CYCLE_DELAY: 3000,
    // THe amount that each operation changes the security level of the server
    WEAKEN_POTENCY: 0.05,
    HACK_HARDENING: 0.002,
    GROW_HARDENING: 0.004,
};
