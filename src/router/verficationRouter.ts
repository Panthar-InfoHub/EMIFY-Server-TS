import verifyPAN from "@/controllers/verification/verifyPAN.js";
import {Router} from "express";


const verificationRouter = Router({mergeParams: true, caseSensitive: false});

verificationRouter.post("/pan", verifyPAN);

export default verificationRouter;