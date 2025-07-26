import {Router} from "express";
import initiateLogin from "../controllers/auth/initiateLogin.js";
import validateOTP from "../controllers/auth/validateOTP.js";

const authRouter = Router({mergeParams: true});


authRouter.post("/initiate", initiateLogin);

authRouter.post("/validate-otp", validateOTP);

authRouter.patch("/:user_id", () => {})

export default authRouter;