import Server from '/src/classes/Server.js';
export default class HomeServer extends Server {
    constructor() {
        super('home');
    }
    static getInstance() {
        if (!HomeServer.instance) {
            HomeServer.instance = new HomeServer();
        }
        return HomeServer.instance;
    }
    isHome() {
        return true;
    }
}
