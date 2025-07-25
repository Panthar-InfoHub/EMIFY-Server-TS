import {Router} from "express";

const authRouter = Router({mergeParams: true});


authRouter.post("/initiate-login", () => {})

authRouter.post("/validate-otp", () => {})

authRouter.patch("/:user_id", () => {})

export default authRouter;