// The implementations ---------------------------------------------------
export var ServerRequestCode;
(function (ServerRequestCode) {
    ServerRequestCode[ServerRequestCode["UPDATE"] = 0] = "UPDATE";
})(ServerRequestCode || (ServerRequestCode = {}));
export var JobRequestCode;
(function (JobRequestCode) {
    JobRequestCode[JobRequestCode["CURRENT_TARGETS"] = 0] = "CURRENT_TARGETS";
    JobRequestCode[JobRequestCode["IS_PREPPING"] = 1] = "IS_PREPPING";
    JobRequestCode[JobRequestCode["IS_TARGETTING"] = 2] = "IS_TARGETTING";
})(JobRequestCode || (JobRequestCode = {}));
