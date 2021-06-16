// The implementations ---------------------------------------------------
export var ServerRequestCode;
(function (ServerRequestCode) {
    ServerRequestCode[ServerRequestCode["UPDATE"] = 0] = "UPDATE";
})(ServerRequestCode || (ServerRequestCode = {}));
export var ServerResponseCode;
(function (ServerResponseCode) {
    ServerResponseCode[ServerResponseCode["SUCCESSFUL"] = 0] = "SUCCESSFUL";
    ServerResponseCode[ServerResponseCode["FAILURE"] = 1] = "FAILURE";
})(ServerResponseCode || (ServerResponseCode = {}));
