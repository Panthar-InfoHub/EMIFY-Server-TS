import WebError from "@/error/webError.js";
import prisma from "@/lib/prisma.js";
import {BusinessVerificationDocumentType, UserEntityType} from "@prisma/client";
import {Request, Response, NextFunction} from "express";
import {z} from "zod";

const bodySchema = z
  .object({
    entity_type: z.enum(UserEntityType).nonoptional(),
    aadhaar_number: z.string().nonempty(),
    pan_number: z.string().nonempty(),
    pan_selfie_uri: z.string().nonempty(),
    business_doc_type: z.enum(BusinessVerificationDocumentType).optional(),
    business_doc_uri: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.entity_type === 'business') {
      // Check if business_doc_type is missing
      if (!data.business_doc_type) {
        ctx.addIssue({
          code: "invalid_type",
          message: 'business_doc_type is required for business entity type.',
          path: ['business_doc_type'],
          expected: "string"
        });
      }

      // Check if business_doc_file_uri is missing
      if (!data.business_doc_uri) {
        ctx.addIssue({
          code: "invalid_type",
          message: 'business_doc_uri is required for business entity type.',
          path: ['business_doc_uri'],
          expected: "string"
        });
      }
    }
  });

const paramsSchema = z.object({
  user_id: z.string().min(1),
}).required();

export default async function updateUserKYC(req: Request, res: Response, next: NextFunction) {

  const {error:bodyErr, data: body} = bodySchema.safeParse(req.body);
  if (bodyErr) {
    req.logger.info("Validation Error");
    next(bodyErr); return;
  }

  const {error:paramsErr, data:params} = paramsSchema.safeParse(req.params);
  if (paramsErr) {
    req.logger.info("Validation Error");
    next(paramsErr);
    return;
  }

  try {

    const data = await prisma.$transaction(async (tx) => {

      const user = await tx.user.findUnique({
        where: {
          id: params.user_id
        },
        select: {
          id: true,
          entity_type: true,
          user_kyc: true,
        }
      });

      if (!user) {
        req.logger.info("User not found");
        throw new WebError("User not found", 404);
      }

      req.logger.info("user found");

      const kycEntry = await tx.user_kyc.upsert({
        where: {
          id: params.user_id
        },
        create: {
          id: params.user_id,
          aadhaar_number: body.aadhaar_number,
          pan_number: body.pan_number,
          pan_selfie_uri: body.pan_selfie_uri,
          business_doc_uri: body.business_doc_uri,
          business_doc_type: body.business_doc_type,
        },
        update: {
          aadhaar_number: body.aadhaar_number,
          pan_number: body.pan_number,
          pan_selfie_uri: body.pan_selfie_uri,
          business_doc_uri: body.business_doc_uri,
          business_doc_type: body.business_doc_type,
        }
      });

      req.logger.info("User kyc updated")
      req.logger.verbose(kycEntry);

      return kycEntry;
    })

    res.status(200).json(data);



  } catch (e) {
    console.error("Failed to update user KYC", e);
    req.logger.error(e);
    next(e);

  }




}