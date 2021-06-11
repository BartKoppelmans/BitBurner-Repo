export var ServerType;
(function (ServerType) {
    ServerType[ServerType["BasicServer"] = 0] = "BasicServer";
    ServerType[ServerType["HackableServer"] = 1] = "HackableServer";
    ServerType[ServerType["HomeServer"] = 2] = "HomeServer";
    ServerType[ServerType["PurchasedServer"] = 3] = "PurchasedServer";
})(ServerType || (ServerType = {}));
