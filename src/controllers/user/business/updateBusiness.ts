import prisma from "@/lib/prisma.js";
import {Request, Response, NextFunction} from "express";
import {z} from "zod";
import {BusinessCategory, BusinessType} from "@prisma/client";


const bodySchema = z.object({
  name: z.string().max(255).nonempty(),
  email: z.email().max(255).nonempty(),
  type: z.enum(BusinessType),
  category: z.enum(BusinessCategory),
  address_line_1: z.string().max(255).nonempty(),
  address_line_2: z.string().max(255),
  pincode: z.string().max(6).nonempty(),
  city: z.string().max(255).nonempty(),
  state: z.string().max(100).nonempty(),
  landmark: z.string().max(255).optional()
}).required();

const paramsSchema = z.object({
  user_id: z.string().nonempty(),
})


export default async function updateBusiness(req: Request, res: Response, next: NextFunction) {

  const {error : bodyErr, data: body} = bodySchema.safeParse(req.body);
  if (bodyErr) {
    req.logger.info("Validation Failed")
    next(bodyErr); return;
  }

  const {error: paramsErr, data: params} = paramsSchema.safeParse(req.params);
  if (paramsErr) {
    req.logger.info("Validation Failed")
    next(paramsErr); return;
  }

  try {

    const user = await prisma.user.findUnique({
      where: {
        id: params.user_id,
      },
      select: {
        id: true,
        user_business: true
      }
    });

    if (!user) {
      req.logger.info("User not found");
      res.status(404).json({message: "User not found"});
      return;
    }

    if (!user.user_business) {

      req.logger.debug("Existing user business details do not exist")
      const newBusiness = await prisma.user_business.create({
        data: {
          id: params.user_id,
          ...body
        }
      })

      req.logger.info("User Business info created successfully")

      res.status(201).json({message: "User Business info created successfully", data: newBusiness});
      return;

    }

    // Business exists, update it!

    const updatedBusiness = await prisma.user_business.update({
      where: {
        id: params.user_id,
      },
      data: {
        ...body
      }
    });

    req.logger.info("User Business info updated successfully");
    req.logger.verbose(updatedBusiness);

    res.status(200).json({
      message: "User Business info updated successfully",
      data: updatedBusiness
    });

    return;

  } catch (e) {
    console.error("Failed to update user's business details",e);
    req.logger.error(e);
    next(e);
    return;
  }



}