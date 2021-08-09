export var ServerType;
(function (ServerType) {
    ServerType[ServerType["BasicServer"] = 0] = "BasicServer";
    ServerType[ServerType["HackableServer"] = 1] = "HackableServer";
    ServerType[ServerType["HomeServer"] = 2] = "HomeServer";
    ServerType[ServerType["PurchasedServer"] = 3] = "PurchasedServer";
    ServerType[ServerType["DarkWebServer"] = 4] = "DarkWebServer";
})(ServerType || (ServerType = {}));
export var ServerPurpose;
(function (ServerPurpose) {
    ServerPurpose[ServerPurpose["NONE"] = 0] = "NONE";
    ServerPurpose[ServerPurpose["PREP"] = 1] = "PREP";
    ServerPurpose[ServerPurpose["HACK"] = 2] = "HACK";
})(ServerPurpose || (ServerPurpose = {}));
export var ServerStatus;
(function (ServerStatus) {
    ServerStatus[ServerStatus["NONE"] = 0] = "NONE";
    ServerStatus[ServerStatus["PREPPING"] = 1] = "PREPPING";
    ServerStatus[ServerStatus["TARGETING"] = 2] = "TARGETING";
})(ServerStatus || (ServerStatus = {}));
