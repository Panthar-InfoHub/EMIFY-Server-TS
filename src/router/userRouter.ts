import { Router } from 'express';

import getProfile from "@/controllers/user/getProfile.js";
import updateProfile from "@/controllers/user/updateProfile.js";
import checkBearerTokenExistence from "@/middlewares/check-bearer-token.js";


const userRouter = Router();

userRouter.get('/:user_id/profile', checkBearerTokenExistence("required"), getProfile);

userRouter.patch("/:user_id/profile", checkBearerTokenExistence("required"), updateProfile)

export default userRouter;