export default class WebError extends Error {

    headers: Record<string, string> = {};
    status = 200;
    cause?: unknown;

    constructor(message: string, status = 200, name?: string, cause?: unknown, headers?: Record<string, string>) {
        super(message);
        this.name = name ?? 'WebError';
        this.status = status;
        this.cause = cause;
        if (headers) {
            this.headers = { ...this.headers, ...headers };
        }
    }

    toJSON() {
        return {
            cause: this.cause,
            message: this.message,
            name: this.name,
            status: this.status,
            headers: this.headers
        }
    }
}