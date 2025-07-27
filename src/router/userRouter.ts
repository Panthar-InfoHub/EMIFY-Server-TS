import { Router } from 'express';

import getProfile from "@/controllers/user/getProfile.js";
import checkBearerTokenExistence from "@/middlewares/check-bearer-token.js";


const userRouter = Router();

userRouter.get('/:user_id/profile', checkBearerTokenExistence("required"), getProfile);

export default userRouter;