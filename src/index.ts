import accountRouter from "@/router/accountRouter.js";
import businessRouter from "@/router/businessRouter.js";
import mediaRouter from "@/router/mediaRouter.js";
import verificationRouter from "@/router/verficationRouter.js";
import dotenv from 'dotenv';
dotenv.config();
import prisma from "@/lib/prisma.js";
import express, {NextFunction, Request, Response} from 'express';
import WebError from "@/error/webError.js";
import cors from "cors";
import {reqIdGenMiddleware} from "@/lib/logger.js";
import authRouter from "@/router/authRouter.js";
import userRouter from "@/router/userRouter.js";
import {z} from "zod";

const app = express();
app.use(cors({origin: "*"}));
const PORT = parseInt(String(process.env.PORT)) || 8080;
app.use(reqIdGenMiddleware)

app.get("/", (_, res) => {
  res.send("OK");
})

app.use("/v1/media", mediaRouter)

app.use(express.json());
app.use("/v1/verification", verificationRouter)
app.use("/v1/auth", authRouter);
app.use("/v1/user", userRouter);
app.use("/v1/user/:user_id/accounts", accountRouter);
app.use("/v1/user/:user_id/business", businessRouter);


// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ErrorHandler(err: any, req:Request, res:Response, next: NextFunction) {
  req.logger.verbose(err);
  if (err instanceof z.ZodError) {
    res.status(400).json({
      name: err.name,
      issues: err.issues,
    })
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


prisma.$connect()
  .then(() => {
    console.log("Connected to database");

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT.toString()}`);
    });

  })
  .catch((err: unknown) => {
    console.error(err);
  });



