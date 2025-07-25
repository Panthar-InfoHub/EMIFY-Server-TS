import dotenv from 'dotenv';
dotenv.config();


import express from 'express';
import { PrismaClient } from '@prisma/client';
import authRouter from "./router/authRouter.js";

const app = express();

const PORT = parseInt(String(process.env.PORT)) || 8080;

app.get("/", (_, res) => {
    res.send("OK");
})

app.use("/v1/auth", express.json(), authRouter);

const client = new PrismaClient();
client.$connect()
    .then(() => {
        console.log("Connected to database");
    })
    .catch((err) => {
        console.error(err);
    });


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});