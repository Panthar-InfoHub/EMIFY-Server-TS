import {NextFunction, Request, Response} from "express";
import jsonwebtoken from "jsonwebtoken";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

import WebError from "../error/webError.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let publicKey: string;

try {
    publicKey = fs.readFileSync(
        path.join(__dirname, '../../keys/es256_public.pem'),
        'utf-8'
    );
    console.log('Public key loaded successfully from:', path.join(__dirname, '../../keys/es256_public.pem'));
} catch (error) {
    console.error('Failed to load public key:', error);
    throw error;
}

export default function checkBearerTokenExistence(type: "optional" | "required" = "optional") {
    return (req: Request, _res: Response, next: NextFunction) => {
        try {
            console.log('Middleware executing with type:', type);
            const authHeader = req.headers.authorization;

            if (!authHeader && type === "required") {
                console.log('No auth header and type is required');
                next(new WebError(
                    "No Authorization header found", 
                    401, 
                    "AuthHeaderMissingError", 
                    "No authorization header was provided",
                    { "X-Error-Type": "missing_auth_header" }
                ));
                return;
            }

            if (authHeader) {
                console.log('Auth header found');

                const token = authHeader.split(" ")[1];
                if (!token) {
                    console.log('No token found in auth header');
                    next(new WebError(
                        "No token found", 
                        401, 
                        "TokenMissingError", 
                        "Authorization header does not contain a token",
                        { "X-Error-Type": "missing_token" }
                    ));
                    return;
                }

                try {
                    console.log('Verifying token...');
                    const decodedToken = jsonwebtoken.verify(token, publicKey, {
                        algorithms: ["ES256"],
                        issuer: "emify-backend",
                    });

                    if (typeof decodedToken !== "object") {
                        console.log('Decoded token is not an object');
                        next(new WebError(
                            "Invalid token format", 
                            401, 
                            "TokenFormatError", 
                            "Decoded token is not an object",
                            { "X-Error-Type": "invalid_token_format" }
                        ));
                        return;
                    }

                    req.decoded_token = decodedToken as never;
                    console.log('Token verified successfully');

                    req.logger.debug("Decoded Token saved into req.decoded_token");

                    next();

                } catch (jwtError) {
                    console.error('JWT verification failed:', jwtError);
                    next(new WebError(
                        "Token verification failed", 
                        401, 
                        "TokenVerificationError", 
                        jwtError instanceof Error ? jwtError.message : String(jwtError),
                        { "X-Error-Type": "token_verification_failed" }
                    ));
                    return;
                }

            } else {
                console.log('No auth header but type is optional');
                req.logger.info("No Authorization header found but checking mode is optional");
                next();
            }

        } catch (error) {
            console.error('Middleware error:', error);
            next(new WebError(
                "Internal server error in auth middleware", 
                500, 
                "AuthMiddlewareError", 
                error instanceof Error ? error.message : String(error),
                { "X-Error-Type": "auth_middleware_error" }
            ));
        }
    };
}