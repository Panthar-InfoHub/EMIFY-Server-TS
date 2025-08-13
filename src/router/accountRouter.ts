import addBankAccount from "@/controllers/user/accounts/addBankAccount.js";
import addUpiHandle from "@/controllers/user/accounts/addUpiHandle.js";
import getUserAccountsAndUPI from "@/controllers/user/accounts/getUserAccountsAndUPI.js";
import {Router} from "express";


// mounted at /v1/user/accounts/
const accountRouter = Router({mergeParams: true, caseSensitive: false});

accountRouter.post("/bank-account", addBankAccount);

accountRouter.post("/upi", addUpiHandle);

accountRouter.get("/", getUserAccountsAndUPI)



export default accountRouter;