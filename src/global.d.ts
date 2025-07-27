

declare namespace Express {
    export interface Request {
        decoded_token?: import("./controllers/auth/validateOTP.js").PrimaryTokenPayload
        logger: import("winston").Logger;
    }
    export interface Response {
        logger: import("winston").Logger;
    }
}
