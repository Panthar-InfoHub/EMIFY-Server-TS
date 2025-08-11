import mediaRouter from "@/router/mediaRouter.js";
import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import express, {NextFunction, Request, Response} from 'express';

import WebError from "@/error/webError.js";
import {reqIdGenMiddleware} from "@/lib/logger.js";
import authRouter from "@/router/authRouter.js";
import userRouter from "@/router/userRouter.js";
import {z} from "zod";

const app = express();

const PORT = parseInt(String(process.env.PORT)) || 8080;
app.use(reqIdGenMiddleware)

app.get("/", (_, res) => {
    res.send("OK");
})

app.use("/v1/media", mediaRouter)

app.use(express.json());
app.use("/v1/auth", authRouter);
app.use("/v1/user", userRouter);

const client = new PrismaClient();
client.$connect()
    .then(() => {
        console.log("Connected to database");
    })
    .catch((err: unknown) => {
        console.error(err);
    });


// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ErrorHandler(err: any, req:Request, res:Response, next: NextFunction) {
    req.logger.verbose(err);
    if (err instanceof z.ZodError) {
        res.status(400).json(err)
        return;
    }


    if (err instanceof WebError) {

        // set appropriate headers
         
        for (const header of Object.keys(err.headers)) {
             
            res.setHeader(header, err.headers[header]);
        }
         
        res.status(err.status).json(err)
        return;
    }


    if (err instanceof Error) {
        res.status(500).json({
            message: err.message,
            name: err.name,
        })
        return
    }

    res.status(500).json({
        message: "Internal server error",
    })
    next()
}

app.use(ErrorHandler);


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT.toString()}`);
});