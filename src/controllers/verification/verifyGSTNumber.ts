import {GSTINValidResponse} from "@/types/easebuzz/verification.js";
import {getEaseBuzzEnv} from "@/utils/getEaseBuzzEnv.js";
import {Request, Response, NextFunction} from "express";
import crypto from "node:crypto";
import {z} from "zod";

const schema = z.object({
  gstin: z.string().min(1)
}).required()

export default async function verifyGSTNumber(req: Request, res: Response, next: NextFunction) {

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
    const hashContent = `${apiKey}|${body.gstin}|${salt}`
    hash.update(hashContent)
    const d = hash.digest('hex');

    const payload = {
      // unique_request_number: "ABCDEFGHIJKLMNOPQRST",
      key: process.env.EASEBUZZ_API_VERIFICATION_API_KEY,
      gstin: body.gstin,
      consent: true,
    }

    const mockURL= "https://stoplight.io/mocks/easebuzz/9-verification-suite/999130184/gstin/"
    const prodURL = "https://api.easebuzz.com/verify/v1/gstin/"

    const response = await fetch(getEaseBuzzEnv(prodURL, mockURL), {
      method: "POST",
      headers: {
        Authorization: d,
        Accept: 'application/json',
        "Content-type": "application/json",
        "Prefer": "code:200, example=Response Payload"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json() as GSTINValidResponse;
    req.logger.verbose(data);

    if (!response.ok) {
      req.logger.error("Verify GSTIN API Failed");
      res.status(200)
      res.header("Content-Type", "application/json")
      res.send(data) // this is already parsed as JSON
      return;
    }

    req.logger.debug("Verify GSTIN API Execution Success");

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