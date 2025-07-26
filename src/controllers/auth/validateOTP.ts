import { PrismaClient } from '@prisma/client';
import {Request, Response, NextFunction} from 'express';
import joi from "joi";
import jsonwebtoken from "jsonwebtoken";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from 'node:url';

import JoiError from "../../error/joiError.js";
import WebError from "../../error/webError.js";

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const privateKey = fs.readFileSync(
    path.join(__dirname, '../../../keys/es256_private.pem'),
    'utf-8'
);

const schema = joi.object({
    code: joi.string().required().regex(/^\d{6}$/),
    user_id: joi.string().required(),
})

interface body {
    code: string;
    user_id: string;
}

export default async function validateOTP(req: Request, res: Response, next: NextFunction) {

    const {error} = schema.validate(req.body, {abortEarly: false, presence: "required"});
    if (error) {
        req.logger.error("Validation Failed");
        next(new JoiError(error)); return;
    }

    const client = new PrismaClient();
    const {code, user_id} = req.body as body;

    try {

        const jwts = await client.$transaction(async (tx) => {

            const OTPEntry = await tx.userAuthOTP.findUnique({
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

            // Generate JWT
            const primaryTokenPayload = {
                disabled: OTPEntry.user.user_authentication?.disabled,
                email: OTPEntry.user.user_authentication?.email,
                id : OTPEntry.user.id,
                mobile: OTPEntry.user.user_authentication?.mobile,
            }

            const refreshTokenPayload = {
                id : OTPEntry.user.id
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
            })

            await tx.userAuthOTP.delete({
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