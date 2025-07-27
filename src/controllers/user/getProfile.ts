import {PrismaClient} from "@prisma/client";
import {NextFunction, Request, Response} from "express";
import joi from "joi";

import JoiError from "@/error/joiError.js";
import WebError from "@/error/webError.js";


const schema = joi.object({
    user_id: joi.string().required().uuid(),
})

/*
* middleware should check if the user attempting to access the profile is the user itself
* */
export default async function getProfile(req: Request, res: Response, next: NextFunction) {

    const {error} = schema.validate(req.params, {abortEarly: false, presence: "required"});
    if (error) {
        req.logger.error("Validation Failed");
        next(new JoiError(error)); return;
    }

    const client = new PrismaClient();
    const {user_id}  = req.params;

    req.logger.info(`Fetching profile for user ${user_id}`)

    try {

        const userData = await client.user.findUnique({
            select: {
                created_at: true,
                entity_type: true,
                first_name: true,
                id: true,
                last_name: true,
                updated_at: true,
                user_authentication: true,
                user_device_session: true,
                user_kyc: false,
            },
            where: {
                id: user_id
            }
        });

        if (!userData) {
            req.logger.info("User not found")
            next(new WebError("User not found", 404, "UserNotFoundErr"))
        }

        res.status(200).json(userData);
        return;

    }
    catch (e) {
        console.error(e)
        req.logger.info("Failed to get profile")
        req.logger.error(e);
        next(e); return;

    }


}