import dotenv from 'dotenv';
dotenv.config();


import express, {Request, Response, NextFunction} from 'express';
import { PrismaClient } from '@prisma/client';
import authRouter from "./router/authRouter.js";
import {reqIdGenMiddleware} from "./lib/logger.js";
import joi from "joi";
import JoiError from "./error/joiError.js";
import WebError from "./error/webError.js";

const app = express();

const PORT = parseInt(String(process.env.PORT)) || 8080;
app.use(reqIdGenMiddleware)

app.get("/", (_, res) => {
    res.send("OK");
})


app.use(express.json());
app.use("/v1/auth", authRouter);

const client = new PrismaClient();
client.$connect()
    .then(() => {
        console.log("Connected to database");
    })
    .catch((err) => {
        console.error(err);
    });

async function ErrorHandler(err: any, req:Request, res:Response, _:NextFunction) {
    req.logger.verbose(err);
    if (err instanceof joi.ValidationError) {
        res.status(400).json(err.details)
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

    if (err instanceof JoiError) {
        res.status(400).json(err.errors)
        return
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
    return
}

app.use(ErrorHandler);


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});