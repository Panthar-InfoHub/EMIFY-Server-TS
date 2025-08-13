

// mounted at /v1/user/:user_id/business

import updateBusiness from "@/controllers/user/business/updateBusiness.js";
import {Router} from "express";

const businessRouter = Router({mergeParams: true, caseSensitive: false});

businessRouter.put("/", updateBusiness);

export default businessRouter;