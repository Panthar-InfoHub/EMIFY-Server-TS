import {NextFunction, Request, Response} from "express";
import {z} from "zod"


const schema = z.object({
    path: z.string(),
}).required();

export default async function uploadMedia(req: Request, res: Response, next: NextFunction) {
    
    const {error, data: body} = schema.safeParse(req.body);
    if (error) {
        req.logger.error("Validation Failed");
        next(error); return;
    }
    
    const {path} = body;
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