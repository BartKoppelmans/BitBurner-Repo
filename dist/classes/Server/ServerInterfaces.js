export var ServerType;
(function (ServerType) {
    ServerType["BasicServer"] = "BasicServer";
    ServerType["HackableServer"] = "HackableServer";
    ServerType["HomeServer"] = "HomeServer";
    ServerType["PurchasedServer"] = "PurchasedServer";
    ServerType["HacknetServer"] = "HacknetServer";
    ServerType["DarkWebServer"] = "DarkWebServer";
})(ServerType || (ServerType = {}));
export var ServerPurpose;
(function (ServerPurpose) {
    ServerPurpose["NONE"] = "None";
    ServerPurpose["PREP"] = "Prep";
    ServerPurpose["HACK"] = "Hack";
})(ServerPurpose || (ServerPurpose = {}));
export var ServerStatus;
(function (ServerStatus) {
    ServerStatus["NONE"] = "None";
    ServerStatus["PREPPING"] = "Prep";
    ServerStatus["TARGETING"] = "Hack";
})(ServerStatus || (ServerStatus = {}));
