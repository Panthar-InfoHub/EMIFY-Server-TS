import addBankAccount from "@/controllers/user/accounts/addBankAccount.js";
import addUpiHandle from "@/controllers/user/accounts/addUpiHandle.js";
import {Router} from "express";


// mounted at /v1/user/accounts/
const accountRouter = Router({mergeParams: true, caseSensitive: false});

accountRouter.post("/bank-account", addBankAccount);

accountRouter.post("/upi", addUpiHandle);


export default accountRouter;