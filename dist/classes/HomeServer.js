import Server from '/src/classes/Server.js';
import { CONSTANT } from "/src/lib/constants.js";
export default class HomeServer extends Server {
    constructor(ns) {
        super(ns, CONSTANT.HOME_SERVER_HOST);
    }
    static getInstance(ns) {
        if (!HomeServer.instance) {
            HomeServer.instance = new HomeServer(ns);
        }
        return HomeServer.instance;
    }
}
