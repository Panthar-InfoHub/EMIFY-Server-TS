import client from '@/lib/prisma.js';
import {NextFunction, Request, Response} from 'express';
import jsonwebtoken from "jsonwebtoken";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from 'node:url';
import { v4 } from "uuid";
import {z} from "zod";

import WebError from "../../error/webError.js";

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const privateKey = fs.readFileSync(
    path.join(__dirname, '../../../keys/es256_private.pem'),
    'utf-8'
);

const schema = z.object({
    code: z.string().min(6).regex(/^\d{6}$/),
    device_name: z.string().min(1),
    fb_installation_id: z.string().min(1),
    fcm_token: z.string().min(1),
    user_id: z.string().min(1),
}).required()

export interface PrimaryTokenPayload {
    disabled: boolean | undefined;
    email: null | string | undefined;
    id: string;
    phone: string | undefined;
}

export interface RefreshTokenPayload {
    fb_installation_id: string;
    id: string;
    session_id: string;
}



export default async function validateOTP(req: Request, res: Response, next: NextFunction) {

    const {error, data: body} = schema.safeParse(req.body);
    if (error) {
        req.logger.error("Validation Failed");
        next(error); return;
    }

    const {code, device_name, fb_installation_id, fcm_token, user_id} = body;

    try {

        const jwts = await client.$transaction(async (tx) => {

            const OTPEntry = await tx.user_auth_otp.findUnique({
                include: {
                    user: {
                        include: {
                            user_authentication: true
                        }
                    }
                },
                where: {
                    code: code,
                    id: user_id,
                }
            })

            if (!OTPEntry) {
                req.logger.info("Invalid OTP")
                throw new WebError("Invalid OTP", 403, "InvalidOTPErr")
            }

            const session_id = v4()

            req.logger.info("Creating Session Entry")
            await tx.user_device_session.create({
                data: {
                    created_at: new Date(),
                    device_name: device_name,
                    fb_installations_id: fb_installation_id,
                    fcm_token: fcm_token,
                    id: session_id,
                    updated_at: new Date(),
                    user_id: OTPEntry.id,
                }
            })

            // Generate JWT
            const primaryTokenPayload: PrimaryTokenPayload = {
                disabled: OTPEntry.user.user_authentication?.disabled,
                email: OTPEntry.user.user_authentication?.email,
                id : OTPEntry.user.id,
                phone: OTPEntry.user.user_authentication?.phone,
            }

            const refreshTokenPayload : RefreshTokenPayload = {
                fb_installation_id: fb_installation_id,
                id : OTPEntry.user.id,
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

            await tx.user_auth_otp.delete({
                where: {
                    id: OTPEntry.id,
                }
            })
            req.logger.info("Deleted OTP Entry")

            return {
                primary_token: primaryToken,
                refresh_token: refreshToken,
            }

        })

        res.status(200).json({
            primary_token: jwts.primary_token,
            refresh_token: jwts.refresh_token,
        })

        return;

    } catch (e) {
        console.error(e)
        req.logger.info("Failed to validate OTP")
        req.logger.error(e);
        next(e); return;
    }
}