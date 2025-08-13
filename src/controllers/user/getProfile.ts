import {NextFunction, Request, Response} from "express";
import client from "@/lib/prisma.js"
import {LogicalError} from "@/error/logicalError.js";
import WebError from "@/error/webError.js";
import {z} from "zod";


const schema = z.object({
    user_id: z.uuid(),
})

/*
* middleware should check if the user attempting to access the profile is the user itself
* */
export default async function getProfile(req: Request, res: Response, next: NextFunction) {

    if (!req.decoded_token?.id) {
        throw new LogicalError("Middleware not set-up correctly", "MiddlewareLogicErr")
    }

    const {error, data: params} = schema.safeParse(req.params);
    if (error) {
        req.logger.error("Validation Failed");
        next(error); return;
    }

    const {user_id}  = params;

    if (user_id !== req.decoded_token.id) {
        req.logger.info("User is not authorized to access this profile")
        next(new WebError("User is not authorized to access this profile", 401, "UnauthorizedErr"))
        return;
    }

    req.logger.info(`Fetching profile for user ${user_id}`);

    try {

        const userData = await client.user.findUnique({
            select: {
                created_at: true,
                entity_type: true,
                first_name: true,
                id: true,
                last_name: true,
                profile_img_url: true,
                updated_at: true,
                user_authentication: true,
                user_device_sessions: true,
                user_business: true,
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