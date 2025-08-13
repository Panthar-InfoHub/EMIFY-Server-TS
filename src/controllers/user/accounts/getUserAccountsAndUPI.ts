import prisma from "@/lib/prisma.js";
import {Request, Response, NextFunction} from "express";
import {z} from "zod";

const schema = z.object({
  user_id: z.string().min(1),
}).required();

export default async function getUserAccountsAndUPI(req: Request, res: Response, next: NextFunction) {

  const {error, data: params} = schema.safeParse(req.params);
  if (error) {
    req.logger.info("Validation Error");
    next(error); return;
  }


  try {

    const data = await prisma.user.findUnique({
      where: {
        id: params.user_id
      },
      select: {
        id: true,
        user_upi_ids: true,
        user_bank_accounts: true
      }
    });


    if (!data) {
      req.logger.info("user data not found")
      res.status(404).json({
        message: "Not Found",
      })
      return;
    }

    req.logger.info(data);

    res.status(200).json(data);

  } catch (e) {
    console.error("Failed to find user's bank account and UPI Handles",e);
    req.logger.error(e);
    next(e);
    return;
  }

}