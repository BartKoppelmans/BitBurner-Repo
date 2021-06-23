// The implementations ---------------------------------------------------
export var ServerRequestCode;
(function (ServerRequestCode) {
    ServerRequestCode[ServerRequestCode["UPDATE_SERVER_MAP"] = 0] = "UPDATE_SERVER_MAP";
    ServerRequestCode[ServerRequestCode["UPDATE_SERVER_STATUS"] = 1] = "UPDATE_SERVER_STATUS";
    ServerRequestCode[ServerRequestCode["UPDATE_SERVER_PURPOSE"] = 2] = "UPDATE_SERVER_PURPOSE";
})(ServerRequestCode || (ServerRequestCode = {}));
export var ControlFlowCode;
(function (ControlFlowCode) {
    ControlFlowCode[ControlFlowCode["KILL_MANAGERS"] = 0] = "KILL_MANAGERS";
    ControlFlowCode[ControlFlowCode["KILL_DAEMON"] = 1] = "KILL_DAEMON";
})(ControlFlowCode || (ControlFlowCode = {}));
