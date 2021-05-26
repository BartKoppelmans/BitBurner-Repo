"use strict";
class TooManyTargetsError extends Error {
    constructor(message) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = TooManyTargetsError.name;
    }
}
