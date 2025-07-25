import {Router} from "express";
import initiateLogin from "../controllers/auth/initiateLogin.js";

const authRouter = Router({mergeParams: true});


authRouter.post("/initiate", initiateLogin)

authRouter.post("/validate-otp", () => {})

authRouter.patch("/:user_id", () => {})

export default authRouter;