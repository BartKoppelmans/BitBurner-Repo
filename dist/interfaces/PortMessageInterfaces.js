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
export var JobMessageCode;
(function (JobMessageCode) {
    JobMessageCode[JobMessageCode["NEW_JOB"] = 0] = "NEW_JOB";
    JobMessageCode[JobMessageCode["NEW_BATCH_JOB"] = 1] = "NEW_BATCH_JOB";
})(JobMessageCode || (JobMessageCode = {}));
export var LogMessageCode;
(function (LogMessageCode) {
    LogMessageCode[LogMessageCode["INFORMATION"] = 0] = "INFORMATION";
    LogMessageCode[LogMessageCode["WARNING"] = 1] = "WARNING";
    LogMessageCode[LogMessageCode["HACKING"] = 2] = "HACKING";
    LogMessageCode[LogMessageCode["PURCHASED_SERVER"] = 3] = "PURCHASED_SERVER";
    LogMessageCode[LogMessageCode["CODING_CONTRACT"] = 4] = "CODING_CONTRACT";
})(LogMessageCode || (LogMessageCode = {}));
