import updateUserKYC from "@/controllers/user/kyc/updateUserKYC.js";
import { Router } from 'express';

import getProfile from "@/controllers/user/getProfile.js";
import updateProfile from "@/controllers/user/updateProfile.js";
import checkBearerTokenExistence from "@/middlewares/check-bearer-token.js";


const userRouter = Router({mergeParams: true, caseSensitive: false});

userRouter.get('/:user_id/profile', checkBearerTokenExistence("required"), getProfile);

userRouter.patch("/:user_id/profile", checkBearerTokenExistence("required"), updateProfile);

userRouter.put("/:user_id/kyc", checkBearerTokenExistence("required"), updateUserKYC);

export default userRouter;