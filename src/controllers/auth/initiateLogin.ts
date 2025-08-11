import {easeBuzzAxios} from "@/lib/axios.js";
import client from '@/lib/prisma.js';

// import {CreateContact200Response, CreateContactHashErr} from "@/types/easebuzz/contact.js";
// import {EaseBuzzInvalidTypeErr} from "@/types/easebuzz/index.js";
import {Prisma, PrismaClient} from "@/prisma/client.js";
// import {AxiosError} from "axios";
import { NextFunction, Request, Response } from 'express';
import {v4} from "uuid";
import {z} from "zod";
// import {createHash} from "node:crypto"

import WebError from "../../error/webError.js";

const schema = z.object({
  phone: z.string().regex(/^\d{10}$/),
  email: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
});

const EXPIRE_TIME = 10 * 60 * 1000; // 10 mins


// const ebuzz = easeBuzzAxios();

async function initiateLogin(req: Request, res: Response, next: NextFunction) {

  const {error, data: body} = schema.safeParse(req.body);
  if (error) {
    req.logger.error("Validation Failed");
    next(error);
    return;
  }


  const {phone} = body;

  try {

    const otp = await client.$transaction(async (tx) => {

      // Step 1: Fetch User
      const auth = await tx.userAuthentication.findFirst({
        select: {
          disabled: true,
          id: true,
          user: {
            include: {
              auth_otp: true
            }
          }
        },
        where: {
          phone: phone
        }
      })



      // Step 2: Check Auth
      if (auth?.disabled) {
        req.logger.info(`Account ${auth.id} Disabled`);
        throw new WebError("Account Disabled", 403)
      }

      let userId: string = auth?.id ?? "";

      if (auth?.user.auth_otp?.id) {
        // Delete an existing OTP Entry
        req.logger.info(`Deleting any existing OTP for user ${userId}`);
        await tx.userAuthOTP.delete({
          where: {
            id: userId,
          }
        })
      }

      if (!auth) {
        req.logger.info(`Onboarding new user with phone: ${phone}`);
        userId = await onboardNewUser(body,req, tx);
      }



      // Step 3: Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000);
      req.logger.info(`Generated OTP: ${otp.toString()}`);

      // Step 4: Save OTP in D

      const otpEntry = await tx.userAuthOTP.create({
        data: {
          code: otp.toString(),
          created_at: new Date(),
          expires_at: new Date(Date.now() + EXPIRE_TIME), // active for 10 minutes
          id: userId,
        }
      })

      // Step 5: Send SMS
      req.logger.debug("Sending Mock SMS")

      return otpEntry;

    })

    // Step 6: Send response
    return res.status(200).json({
      otp: otp
    })

  } catch (e) {
    console.error(e)
    req.logger.info("Failed to initiate login")
    req.logger.error(e);
    next(e)
  }

}



async function onboardNewUser(data: {
                                phone: string
                                email?: string | undefined
                                first_name?: string | undefined
                                last_name?: string | undefined
                              },
                              req:Request,
                              tx: Omit<PrismaClient<Prisma.PrismaClientOptions, never>, "$connect" | "$disconnect" | "$extends" | "$on" | "$transaction" | "$use">)
{


  const { phone, email, first_name, last_name } = data;
  const userId = v4();

  await tx.user.create({
    data: {
      easeBuzz_contact_id: null, // not created here
      id: userId,
      first_name: first_name ?? null,
      last_name: last_name ?? null,
      user_authentication: {
        create: {
          disabled: false,
          email: email ?? null,
          phone: phone,
        }
      },
    },
    include: {
      user_authentication: true,
    }
  });

  // if (email && first_name && last_name) {
  //
  //   const salt = process.env.EASEBUZZ_API_SALT;
  //   if (!salt) {
  //     throw new Error("Missing EaseBuzz Salt")
  //   }
  //
  //   req.logger.info("Enough info present, creating user on easeBuzz");
  //
  //   const hash = createHash("sha512");
  //   const rawHashContent = `${userId}|${first_name} ${last_name}|${email}|${phone}|${salt}`;
  //   hash.update(rawHashContent)
  //
  //   try {
  //
  //     const res = await ebuzz.post<CreateContact200Response | EaseBuzzInvalidTypeErr | CreateContactHashErr>(
  //       "/api/v1/contacts",
  //       {
  //         key: userId,
  //         name: `${first_name} ${last_name}`,
  //         email: email,
  //         phone: phone,
  //       },
  //       {
  //         headers: {
  //           "WIRE-API-KEY" : process.env.WIRE_API_KEY,
  //           Authorization: hash.digest('hex')
  //         }
  //       }
  //     );
  //
  //     const data = res.data
  //
  //     if (data.success) {
  //       req.logger.debug("EaseBuzz contact created");
  //       req.logger.verbose(data)
  //
  //       // update user
  //
  //       await tx.user.update(
  //         {
  //           where: {
  //             id: userId,
  //           },
  //           data: {
  //             easeBuzz_contact_id: data.data.id
  //           }
  //         }
  //       )
  //
  //       req.logger.debug("User EaseBuzz ID updated")
  //     }
  //
  //   } catch (e) {
  //     req.logger.error(e);
  //     console.error(e);
  //     if (e instanceof AxiosError) {
  //       req.logger.error("Error is axios Error");
  //     }
  //
  //     throw e;
  //   }
  //
  //
  // }


  return userId;
}

export default initiateLogin;