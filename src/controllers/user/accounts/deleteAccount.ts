import prisma from "@/lib/prisma.js";
import {Request, Response, NextFunction} from "express";
import {z} from "zod";


const paramsSchema = z.object({
  beneficiary_id: z.string().nonempty(),
  user_id: z.string().nonempty(),
});

const querySchema = z.object({
  type: z.enum(["bank-account", "upi"]).nonoptional(),
})

export default async function deleteAccount(req: Request, res: Response, next: NextFunction) {

  const {error: paramsErr, data: params} = paramsSchema.safeParse(req.params);
  if (paramsErr) {
    req.logger.info("Validation Error");
    next(paramsErr); return;
  }

  const {error: queryError, data: query} = querySchema.safeParse(req.query);
  if (queryError) {
    req.logger.info("Validation Error");
    next(queryError); return;
  }

  try {

    switch (query.type) {
      case "bank-account": {

        const existingAcc = await prisma.user_bank_account.findUnique({
          where: {
            beneficiary_id: params.beneficiary_id,
          }
        });

        if (!existingAcc) {
          req.logger.info("No bank account found.");
          res.status(404).json({
            message: "No bank account found.",
          });
          return;
        }

        if (!existingAcc.deleteable) {
          req.logger.info("Account is not deletable")
          res.status(422).json({
            message: "Account is not deletable",
          });
          return;
        }

        req.logger.info("Account is deletable");

        await prisma.user_bank_account.delete({
          where: {
            beneficiary_id: params.beneficiary_id,
          }
        });

        break;
      }

      case "upi": {

        const existingHandle = await prisma.user_upi_id.findUnique({
          where: {
            beneficiary_id: params.beneficiary_id,
          }
        });

        if (!existingHandle) {
          req.logger.info("No UPI Handle found.");
          res.status(404).json({
            message: "UPI handle not found",
          });
          return;
        }

        if (!existingHandle.deletable) {
          req.logger.info("UPI handle is not deletable.");
          res.status(422).json({
            message: "UPI Handle is not deletable.",
          });
          return;
        }

        req.logger.info("UPI Handle is deletable");

        await prisma.user_upi_id.delete({
          where: {
            beneficiary_id: params.beneficiary_id,
          }
        });

        break;

      }
    }


    res.sendStatus(204);

    return;


  } catch (e) {
    console.error("Error while deleting account", e);
    req.logger.error(e);
    next(e);
    return;
  }


}