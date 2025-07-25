import { Request, Response, NextFunction } from 'express';
import joi from 'joi';
import JoiError from "../../error/joiError.js";
import {Prisma, PrismaClient} from "@prisma/client";
import WebError from "../../error/webError.js";
import {v4} from "uuid";
import {DefaultArgs} from '@prisma/client/runtime/library';

const schema = joi.object({
    mobile: joi.string().required().regex(/^\d{10}$/),
})

type body = {
    mobile: string;
}


async function initiateLogin(req: Request, res: Response, next: NextFunction) {

    console.log("Initiate Login")
    const {error} = schema.validate(req.body);
    if (error) {
        req.logger.error("Validation Failed");
        return next(new JoiError(error));
    }

    const client = new PrismaClient()


    const {mobile}: body = req.body;

    try {

        const otp = await client.$transaction(async (tx) => {

            // Step 1: Fetch User
            const auth = await tx.userAuthentication.findFirst({
                where: {
                    mobile: mobile
                },
            })



            // Step 2: Check Auth
            if (auth && auth.disabled) {
                req.logger.info(`Account ${auth.id} Disabled`);
                throw new WebError("Account Disabled", 403)
            }

            let userId: string = auth?.id || "";

            if (userId) {
                // Delete an existing OTP Entry
                req.logger.info(`Deleting any existing OTP for user ${userId}`);
                tx.userAuthOTP.delete({
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
            req.logger.info("Generated OTP: " + otp);

            // Step 4: Save OTP in Db
            const otpEntry = tx.userAuthOTP.create({
                data: {
                    id: userId,
                    code: otp.toString(),
                    expires_at: new Date(Date.now() + 10 * 60 * 1000), // active for 10 minutes
                    created_at: new Date(),
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
        return next(e)
    }

}



async function onboardNewUser(req: Request,
                              tx: Omit<PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">)
     {


    const { mobile } = req.body;
    const userId = v4()

    await tx.user.create({
        data: {
            id: userId,
            easebuzz_contact_id: userId, // TODO: Create Contact on EaseBuzz
            user_authentication: {
                create: {
                    mobile: mobile,
                    email: null,
                    disabled: false,
                }
            }},
        include: {
            user_authentication: true,
        }
    });


    return userId;
}

export default initiateLogin;