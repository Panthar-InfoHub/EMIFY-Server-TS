import {PanValidationResponse} from "@/types/easebuzz/verification.js";
import {getEaseBuzzEnv} from "@/utils/getEaseBuzzEnv.js";
import {AxiosError} from "axios";
import {Request, Response, NextFunction} from 'express';
import {z} from 'zod';
import * as crypto from "node:crypto";

const schema = z.object({
  pan_number: z.string().min(1),
})

export default async function (req: Request, res: Response, next: NextFunction) {

  const {error, data: body} = schema.safeParse(req.body);
  if (error) {
    req.logger.error("Validation Error");
    next(error);
    return;
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
    const hashContent = `${apiKey}|${body.pan_number}|${salt}`
    hash.update(hashContent)
    const d = hash.digest('hex');


    const payload = {
      // unique_request_number: "ABCDEFGHIJKLMNOPQRST",
      key: process.env.EASEBUZZ_API_VERIFICATION_API_KEY,
      pan_number: body.pan_number,
      consent: true,
    }

    const mockURL= "https://stoplight.io/mocks/easebuzz/9-verification-suite/999130184/pan_number/"
    const prodURL = "https://api.easebuzz.com/verify/v1/pan_number/"

    const response = await fetch(getEaseBuzzEnv(prodURL, mockURL), {
      method: "POST",
      headers: {
        Authorization: d,
        Accept: 'application/json',
        "Content-type": "application/json",
        "Prefer": "code:200, example=Sample Response"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json() as PanValidationResponse;
    req.logger.verbose(data);

    if (!response.ok) {
      req.logger.error("Verify PAN API Failed");
      res.status(200)
      res.header("Content-Type", "application/json")
      res.send(data) // this is already parsed as JSON
      return;
    }

    req.logger.debug("Verify PAN API Execution Success");

    res.header("Content-Type", "application/json")


    if (data.success) {
      req.logger.info("data.success is true");
      res.status(200);
      res.send(data)
      return;

    } else {
      req.logger.error("data.success is false");
      res.status(200)
      res.send(data)
      return;
    }

  } catch (e) {

    console.error(e)

    if (e instanceof AxiosError) {
      res.status(e.response?.status ?? 500).json(e.response?.data);
    } else if (e instanceof Error) {
      res.status(500).json({message: e.message})
      return;
    }


    res.status(500).json(e);
    return;
  }


}