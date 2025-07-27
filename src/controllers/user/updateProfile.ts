import { PrismaClient } from "@prisma/client";
import {NextFunction, Request, Response} from "express";
import joi from "joi";

import JoiError from "@/error/joiError.js";
import {LogicalError} from "@/error/logicalError.js";
import WebError from "@/error/webError.js";

interface body {
    email: string,
    profile_img_url: string,
}

const bodySchema = joi.object({
    email: joi.string().optional().email(),
    profile_img_url: joi.string().optional(),
}).messages({
    "any.required": "Body is required",
}).min(1)

const paramsSchema = joi.object({
    user_id: joi.string().required().uuid(),
})


export default async function updateProfile(req: Request, res: Response, next: NextFunction) {

    if (!req.decoded_token) {
        throw new LogicalError("Middleware not set-up correctly", "MiddlewareLogicErr")
    }

    const {error: bodyErr} = bodySchema.validate(req.body, {abortEarly: false, presence: "required"});
    if (bodyErr) {
        req.logger.error("Validation Failed");
        next(new JoiError(bodyErr)); return;
    }

    const {error: paramsErr} = paramsSchema.validate(req.params, {abortEarly: false, presence: "required"});
    if (paramsErr) {
        req.logger.error("Validation Failed");
        next(new JoiError(paramsErr)); return;
    }


    const {email, profile_img_url} = req.body as body;
    req.logger.verbose(req.body)

    if (req.decoded_token.id !== req.params.user_id) {
        req.logger.info("User is not authorized to update this profile")
        next(new WebError("User is not authorized to update this profile", 403, "UnauthorizedErr"))
        return;
    }

    const client = new PrismaClient()

    try {

        await client.user.update({
            data: {
                profile_img_url: profile_img_url,
                user_authentication: {
                    update: {
                        email: email,
                    }
                },
            },
            where: {
                id: req.decoded_token.id
            }
        });

        req.logger.info("Updated profile")

        res.sendStatus(204);


    } catch (e) {
        console.error(e)
        req.logger.info("Failed to update profile")
        req.logger.error(e);
        next(e); return;
    }





}