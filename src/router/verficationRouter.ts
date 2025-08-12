import verifyGSTNumber from "@/controllers/verification/verifyGSTNumber.js";
import verifyIFSC from "@/controllers/verification/verifyIFSC.js";
import verifyPAN from "@/controllers/verification/verifyPAN.js";
import verifyVPA from "@/controllers/verification/verifyVPA.js";
import {Router} from "express";


const verificationRouter = Router({mergeParams: true, caseSensitive: false});

verificationRouter.post("/pan", verifyPAN);

verificationRouter.post("/gstin", verifyGSTNumber);

verificationRouter.post("/ifsc", verifyIFSC);

verificationRouter.post("/vpa", verifyVPA);

export default verificationRouter;