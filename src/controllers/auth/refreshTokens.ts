import {PrismaClient} from "@prisma/client";
import {NextFunction, Request, Response} from 'express';
import jsonwebtoken from "jsonwebtoken";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

import {PrimaryTokenPayload, RefreshTokenPayload} from "@/controllers/auth/validateOTP.js";
import WebError from "@/error/webError.js";
import {z} from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicKey = fs.readFileSync(
    path.join(__dirname, '../../../keys/es256_public.pem'),
    'utf-8'
);

const privateKey = fs.readFileSync(
    path.join(__dirname, '../../../keys/es256_private.pem'),
    'utf-8'
);

const schema = z.object(({
    fb_installation_id: z.string().min(1),
    refresh_token: z.string().min(1),
    session_id: z.string().min(1),
})).required()

interface body {
    fb_installation_id: string;
    refresh_token: string;
    session_id: string;
}

async function refreshTokens(req: Request, res: Response, next:NextFunction) {

    const {error, data: body} = schema.safeParse(req.body);
    if (error) {
        req.logger.error("Validation Failed");
        next(error);
        return;
    }

    const client = new PrismaClient()

    try {

        const {fb_installation_id, refresh_token, session_id} = body;
        const payload = jsonwebtoken.verify(refresh_token, publicKey, {
            algorithms: ["ES256"],
            issuer: "emify-backend",
        });

        if (typeof payload !== "object") {
            req.logger.debug("Invalid payload. Payload is not an object")
            next(new WebError("Invalid Refresh Token", 403, "InvalidRefreshTokenErr"))
            return
        }

        const {fb_installation_id: payloadFbInstallationId, id : user_id, session_id: payloadSessionId} = payload as RefreshTokenPayload;

        if (payloadFbInstallationId !== fb_installation_id || payloadSessionId !== session_id || !user_id) {
            req.logger.debug("Invalid payload. Payload does not match with the token")
            req.logger.debug({body: req.body as body, payload})
            next(new WebError("Invalid Refresh Token", 403, "InvalidRefreshTokenErr"))
            return
        }


        // Fetch the user with ID
        const jwts = await client.$transaction(async (tx) => {

            const [user, sessionInfo, userAuth] = await Promise.all([
                // user
                tx.user.findUnique({
                    where: {
                        id: user_id,
                    },
                }),
                // session
                tx.userDeviceSession.findUnique({
                    where: {
                        fb_installations_id: fb_installation_id,
                        id: session_id,
                    }
                }),
                // auth
                tx.userAuthentication.findUnique({
                    where: {
                        id: user_id,
                    }
                })
            ])

            if (!user || !userAuth || !sessionInfo) {
                req.logger.debug("UserInfo, SessionInfo or Auth not found")
                throw new WebError("Invalid Refresh Token", 403, "InvalidRefreshTokenErr")
            }


            if (userAuth.disabled) {
                req.logger.debug("User is disabled")
                throw new WebError("User is disabled", 403, "UserDisabledErr")
            }

            if (sessionInfo.expired) {
                req.logger.debug("Session is expired")
                throw new WebError("Session is expired", 403, "SessionExpiredErr")
            }

            // generate new JWTs

            const primaryTokenPayload: PrimaryTokenPayload = {
                disabled: userAuth.disabled,
                email: userAuth.email,
                id : user.id,
                mobile: userAuth.mobile,
            }

            const refreshTokenPayload : RefreshTokenPayload = {
                fb_installation_id: fb_installation_id,
                id : user.id,
                session_id: session_id,
            }

            req.logger.info("Generating JWT")

            // Use ES256 algorithm for EC keys
            const primaryToken = jsonwebtoken.sign(primaryTokenPayload, privateKey, {
                algorithm: "ES256",
                expiresIn: "1h",
                issuer: "emify-backend"
            })

            const refreshToken = jsonwebtoken.sign(refreshTokenPayload, privateKey, {
                algorithm: "ES256",
                expiresIn: "7d",
                issuer: "emify-backend"
            });

            req.logger.info(`Fetched info for user ${user.id}`)

            return {
                primaryToken, refreshToken,
            }

        })


        req.logger.info("Sending response")
        res.status(200).json({
            primary_token: jwts.primaryToken,
            refresh_token: jwts.refreshToken,
        })
        return;


    } catch (e) {

        if (e instanceof jsonwebtoken.TokenExpiredError) {
            req.logger.info("Refresh token expired")
            next(new WebError("Refresh token expired", 403, "RefreshTokenExpiredErr"))
            return
        }

        if (e instanceof jsonwebtoken.JsonWebTokenError) {
            req.logger.info("Invalid refresh token")
            next(new WebError("Invalid refresh token", 403, "InvalidRefreshTokenErr"))
            return
        }

        req.logger.error("Failed to refresh primary token")
        req.logger.error(e);
        next(e);
        return;
    }

}


export default refreshTokens;