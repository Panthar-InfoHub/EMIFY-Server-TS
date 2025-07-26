
export default class WebError extends Error {

    headers: Record<string, string> = {};
    status = 200;

    constructor(message: string, status = 200, name?: string, cause?: string, headers?: Record<string, string>) {
        super(message);
        this.name = name ?? 'WebError';
        this.status = status;
        this.cause = cause;
        this.headers = headers ?? {};
    }


    toJSON() {
        return {
            cause: this.cause,
            message: this.message,
            name: this.name,
            status: this.status,
        }
    }

}