import {Prisma, PrismaClient} from "@prisma/client";
import { NextFunction, Request, Response } from 'express';
import joi from 'joi';
import {v4} from "uuid";

import JoiError from "../../error/joiError.js";
import WebError from "../../error/webError.js";

const schema = joi.object({
    mobile: joi.string().required().regex(/^\d{10}$/),
}).messages({
    "any.required": "Body is required",
})

interface body {
    mobile: string;
}

const EXPIRE_TIME = 10 * 60 * 1000; // 10 mins


async function initiateLogin(req: Request, res: Response, next: NextFunction) {

    const {error} = schema.validate(req.body, {abortEarly: false, presence: "required"});
    if (error) {
        req.logger.error("Validation Failed");
        next(new JoiError(error)); return;
    }

    const client = new PrismaClient()

    const {mobile} = req.body as body;

    try {

        const otp = await client.$transaction(async (tx) => {

            // Step 1: Fetch User
            const auth = await tx.userAuthentication.findFirst({
                select: {
                    disabled: true,
                    id: true,
                    user: {
                        include: {
                            auth_otp: true
                        }
                    }
                },
                where: {
                    mobile: mobile
                }
            })



            // Step 2: Check Auth
            if (auth?.disabled) {
                req.logger.info(`Account ${auth.id} Disabled`);
                throw new WebError("Account Disabled", 403)
            }

            let userId: string = auth?.id ?? "";

            if (auth?.user.auth_otp?.id) {
                // Delete an existing OTP Entry
                req.logger.info(`Deleting any existing OTP for user ${userId}`);
                await tx.userAuthOTP.delete({
                    where: {
                        id: userId,
                    }
                })
            }

            if (!auth) {
                req.logger.info(`Onboarding new user with mobile: ${mobile}`);
                userId = await onboardNewUser(req, tx);
            }



            // Step 3: Generate OTP
            const otp = Math.floor(100000 + Math.random() * 900000);
            req.logger.info(`Generated OTP: ${otp.toString()}`);

            // Step 4: Save OTP in Db
            const otpEntry = await tx.userAuthOTP.create({
                data: {
                    code: otp.toString(),
                    created_at: new Date(),
                    expires_at: new Date(Date.now() + EXPIRE_TIME), // active for 10 minutes
                    id: userId,
                }
            })

            // Step 5: Send SMS
            req.logger.debug("Sending Mock SMS")

            return otpEntry;

        })

        // Step 6: Send response
        return res.status(200).json({
            otp: otp
        })

    } catch (e) {
        console.error(e)
        req.logger.info("Failed to initiate login")
        req.logger.error(e);
        next(e)
    }

}



async function onboardNewUser(req: Request,
                              tx: Omit<PrismaClient<Prisma.PrismaClientOptions, never>, "$connect" | "$disconnect" | "$extends" | "$on" | "$transaction" | "$use">)
     {


    const { mobile } = req.body as body;
    const userId = v4();

    await tx.user.create({
        data: {
            easebuzz_contact_id: userId, // TODO: Create Contact on EaseBuzz
            id: userId,
            user_authentication: {
                create: {
                    disabled: false,
                    email: null,
                    mobile: mobile,
                }
            },
        },
        include: {
            user_authentication: true,
        }
    });


    return userId;
}

export default initiateLogin;