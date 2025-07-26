
export default class WebError extends Error {

    status: number = 200;
    headers: Record<string, string> = {};

    constructor(message: string, status: number = 200, name?: string, cause?: string, headers?: Record<string, string>) {
        super(message);
        this.name = name || 'WebError';
        this.status = status;
        this.cause = cause;
        this.headers = headers || {};
    }


    toJSON() {
        return {
            name: this.name,
            message: this.message,
            status: this.status,
            cause: this.cause,
        }
    }

}