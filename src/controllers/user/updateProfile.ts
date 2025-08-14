import {NextFunction, Request, Response} from "express";
import client from "@/lib/prisma.js"
import {LogicalError} from "@/error/logicalError.js";
import WebError from "@/error/webError.js";
import {z} from "zod";


const bodySchema = z.object({
    email: z.email().optional(),
    profile_img_url: z.string().optional(),
});

const paramsSchema = z.object({
    user_id: z.uuid(),
})


export default async function updateProfile(req: Request, res: Response, next: NextFunction) {

    if (!req.decoded_token) {
        throw new LogicalError("Middleware not set-up correctly", "MiddlewareLogicErr")
    }

    const {error: bodyErr, data: body} = bodySchema.safeParse(req.body);
    if (bodyErr) {
        req.logger.error("Validation Failed");
        next(bodyErr); return;
    }

    const {error: paramsErr, data: params} = paramsSchema.safeParse(req.params);
    if (paramsErr) {
        req.logger.error("Validation Failed");
        next(paramsErr); return;
    }


    const {email, profile_img_url} = body;
    req.logger.verbose(body)

    if (req.decoded_token.id !== params.user_id) {
        req.logger.info("User is not authorized to update this profile")
        next(new WebError("User is not authorized to update this profile", 403, "UnauthorizedErr"))
        return;
    }


    try {

        // TODO: Add update to contact for easbuzz when API is avilable


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