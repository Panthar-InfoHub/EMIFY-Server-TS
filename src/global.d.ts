

declare namespace Express {
    export interface Request {
        logger: import("winston").Logger;
    }
    export interface Response {
        logger: import("winston").Logger;
    }
}
