import WebError from "@/error/webError.js";
import {CreateBeneficiaryResponse} from "@/types/easebuzz/contact.js";
import {getEaseBuzzEnv} from "@/utils/getEaseBuzzEnv.js";
import {Request, Response, NextFunction} from "express";
import {z} from "zod";
import client from "@/lib/prisma.js";
import crypto from "node:crypto";

const bodySchema = z.object({
  beneficiary_type: z.enum(["bank_account"]), // UPI is disabled for now
  beneficiary_name: z.string().min(1).max(150),
  account_number: z.string().min(5),
  ifsc: z.string().min(1),
}).required();

const paramsSchema = z.object({
  user_id: z.string().min(1),
}).required();


export default async function addBankAccount(req: Request, res: Response, next: NextFunction): Promise<void> {

  const {error: bodyErr, data: body} = bodySchema.safeParse(req.body);
  if (bodyErr) {
    req.logger.info("Validation Error");
    next(bodyErr); return;
  }

  const {error: paramsError, data: params} = paramsSchema.safeParse(req.params);
  if (paramsError) {
    req.logger.info("Validation Error");
    next(params); return;
  }



  try {

    await client.$transaction(async (tx) => {

      // Fetch user
      const user = await tx.user.findUnique({
        where: {
          id: params.user_id,
        },
      });

      if (!user) {
        throw new WebError("User not found", 400);
      }

      const existingAccount = await tx.userBankAccount.findFirst({
        where: {
          account_number: body.account_number,
          ifsc: body.ifsc,
          user_id: user.id,
        }
      });

      if (existingAccount) {
        req.logger.info("Bank Account already exists");
        res.json(existingAccount);
      }

      if (!user.easeBuzz_contact_id) {
        throw new WebError("EaseBuzz Contact ID is empty", 422,
          undefined, "User onboarding not completed hence EaseBuzz contact ID is null")
      }


      if (!process.env.EASEBUZZ_API_VERIFICATION_API_KEY) {
        req.logger.error("EASEBUZZ_API_VERIFICATION_API_KEY not set");
        throw Error("EASEBUZZ_API_VERIFICATION_API_KEY not set");
      }

      if (!process.env.EASEBUZZ_API_VERIFICATION_API_SALT) {
        req.logger.error("EASEBUZZ_API_VERIFICATION_API_SALT not set");
        throw new Error("EASEBUZZ_API_VERIFICATION_API_SALT not set");
      }

      if (!process.env.EASEBUZZ_WIRE_API_KEY) {
        req.logger.error("EASEBUZZ_WIRE_API_KEY not set");
        throw new Error("EASEBUZZ_WIRE_API_KEY not set");
      }

      const apiKey = process.env.EASEBUZZ_API_VERIFICATION_API_KEY;
      const wireApiKey = process.env.EASEBUZZ_WIRE_API_KEY;
      const salt = process.env.EASEBUZZ_API_VERIFICATION_API_SALT;


      const upiHandle = "" // this is to satisfy the hash

      const hash = crypto.createHash("sha512");
      const rawHashContent= `${apiKey}|${user.easeBuzz_contact_id}|${body.beneficiary_name}|${body.account_number}|${body.ifsc}|${upiHandle}|${salt}`;
      hash.update(rawHashContent);
      const d = hash.digest('hex');

      const payload = {
        key: apiKey,
        contact_id: user.easeBuzz_contact_id,
        beneficiary_type: body.beneficiary_type,
        beneficiary_name: body.beneficiary_name,
        account_number: body.account_number,
        ifsc: body.ifsc,
      }

      const prodUrl = "https://wire.easebuzz.in/api/v1/beneficiaries/";
      const mockUrl = "https://stoplight.io/mocks/easebuzz/neobanking/90198045/api/v1/beneficiaries/";

      const response = await fetch(
        getEaseBuzzEnv(prodUrl, mockUrl),
        {
          method: "POST",
          headers: {
            Authorization: d,
            "WIRE-API-KEY": wireApiKey,
            Prefer: 'code=200, dynamic=true',
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload)
        }
      );

      const data = await response.json() as CreateBeneficiaryResponse;
      req.logger.debug(data);

      if (!response.ok) {
        req.logger.info("AddOrUpdate BankAccount API Operation Failed");
        throw new WebError("Failed to create Bank Account", 502, undefined, data);
      }

      req.logger.info("EaseBuzz API successfully called");

      if (!data.success) {
        req.logger.info("data.success is false");
        throw new WebError("Failed to create Bank Account", 502, undefined, data);
      }

      const bankAccount = await tx.userBankAccount.create({
        data: {
          user_id: user.id,
          account_number: body.account_number,
          ifsc: body.ifsc,
          account_holder_name: body.beneficiary_name,
          beneficiary_id: data.data.beneficiary.id,
        }
      });

      req.logger.info("Bank Account created");
      req.logger.verbose(bankAccount)

      res.status(201);
      res.header("Content-Type", "application/json");
      res.send(bankAccount);

    })


  } catch (e) {
    console.error(e);
    req.logger.error(e);
    req.logger.info("AddOrUpdate BankAccount API Operation Failed");
    next(e);
  }


}