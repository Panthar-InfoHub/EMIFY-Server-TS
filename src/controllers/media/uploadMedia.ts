import {NextFunction, Request, Response} from "express";
import joi from "joi";

import JoiError from "@/error/joiError.js";


interface body {
    path: string,
}

const schema = joi.object({
    path: joi.string().required(),
}).messages({
    "any.required": "Body is required",
})

export default async function uploadMedia(req: Request, res: Response, next: NextFunction) {
    
    const {error} = schema.validate(req.body, {abortEarly: false, presence: "required"});
    if (error) {
        req.logger.error("Validation Failed");
        next(new JoiError(error)); return;
    }
    
    const {path} = req.body as body;
    req.logger.info(`Uploading media to ${path}`);
    
    
    try {

        // TODO: Implement uploading

        if (!req.file) {
            req.logger.info("No file found")
            res.status(400).json({
                message: "No file found"
            })
            return;
        }


        await new Promise(resolve => setTimeout(resolve, 2000))

        return res.status(200).json({
            url: "https://example.com/media.jpg"
        })
        
         
    } catch (e) {
        console.error(e)
        req.logger.info("Failed to upload media")
        req.logger.error(e);
        next(e); return;
    }
    
    
}