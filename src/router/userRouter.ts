import { Router } from 'express';

import getProfile from "@/controllers/user/getProfile.js";


const userRouter = Router();

userRouter.get('/:user_id/profile', getProfile);

export default userRouter;