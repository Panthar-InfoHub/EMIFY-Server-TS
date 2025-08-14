import {BankAccountVerificationResponse} from "@/types/easebuzz/verification.js";
import {getEaseBuzzEnv} from "@/utils/getEaseBuzzEnv.js";
import {Request, Response, NextFunction} from "express";
import crypto from "node:crypto";
import {z} from "zod";

const schema = z.object({
  account_holder_name: z.string().min(1),
  account_number: z.string().min(1),
  account_ifsc: z.string().min(1),
  verification_type: z.enum(['pennyless', 'penny_drop', 'paisa_drop', 'auto']).default("auto"),
  auto_priority: z.array(z.enum(['pennyless', 'penny_drop', 'paisa_drop', 'auto'])).optional(),
})

export default async function verifyBankAccount(req: Request, res: Response, next: NextFunction) {

  const {error, data: body} = schema.safeParse(req.body);
  if (error) {
    req.logger.error("Validation Error");
    next(error); return;
  }

  if (!process.env.EASEBUZZ_API_VERIFICATION_API_KEY) {
    req.logger.error("EASEBUZZ_API_VERIFICATION_API_KEY not set");
    next(new Error("EASEBUZZ_API_VERIFICATION_API_KEY not set"));
    return;
  }

  if (!process.env.EASEBUZZ_API_VERIFICATION_API_SALT) {
    req.logger.error("EASEBUZZ_API_VERIFICATION_API_SALT not set");
    next(new Error("EASEBUZZ_API_VERIFICATION_API_SALT not set"));
    return;
  }

  const apiKey = process.env.EASEBUZZ_API_VERIFICATION_API_KEY;
  const salt = process.env.EASEBUZZ_API_VERIFICATION_API_SALT;

  try {

    const hash = crypto.createHash("sha512");
    const hashContent = `${apiKey}|${body.account_number}|${salt}`
    hash.update(hashContent)
    const d = hash.digest('hex');

    const payload = {
      // unique_request_number: "ABCDEFGHIJKLMNOPQRST",
      key: apiKey,
      account_number: body.account_number,
      account_ifsc: body.account_ifsc,
      fuzzy_match_text: body.account_holder_name,
      verification_type: body.verification_type,
      auto_priority: body.auto_priority,
      consent: true,
    }

    const mockURL= "https://stoplight.io/mocks/easebuzz/9-verification-suite/999130184/bank_account/"
    const prodURL = "https://api.easebuzz.in/verify/v1/bank_account/"

    const response = await fetch(getEaseBuzzEnv(prodURL, mockURL), {
      method: "POST",
      headers: {
        Authorization: d,
        Accept: 'application/json',
        "Content-type": "application/json",
        "Prefer": "code:200, example=Sample Failure Response Payload (Pennydrop)"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json() as BankAccountVerificationResponse;
    req.logger.verbose(data);

    if (!response.ok) {
      req.logger.error("Verify Bank Account API Failed");
      res.status(500)
      res.header("Content-Type", "application/json")
      res.send(data) // this is already parsed as JSON
      return;
    }

    req.logger.debug("Verify Bank Account Execution Success");

    res.header("Content-Type", "application/json")


    if (data.success) {
      req.logger.info("data.success is true");
      res.status(response.status);
      res.send(data)
      return;

    } else {
      req.logger.error("data.success is false");
      res.status(response.status)
      res.send(data)
      return;
    }


  } catch (e) {
    console.error(e);
    res.status(500).json({message: (e as Error).message})
    return;

  }

}