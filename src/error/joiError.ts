import { ValidationError } from "joi";


export default class JoiError extends Error {

    declare errors: ValidationError["details"];


    constructor(err: ValidationError) {
        super(err.message);
        this.name = err.name;
        this.cause = err.cause;
        this.stack = err.stack;
        this.errors = err.details;
    }

    toJSON() {
        return {
            cause: this.cause,
            errors: this.errors,
            message: this.message,
            name: this.name,
            stack: this.stack,
        }
    }
}