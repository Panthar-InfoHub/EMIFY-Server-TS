import WebError from "@/error/webError.js";


export class LogicalError extends WebError {

    constructor(message: string, name?: string, cause?: string, headers?: Record<string, string>) {
        super(message, 500, name, cause, headers);
    }

}