import { Router } from 'express';
import multer from "multer";

import uploadMedia from "@/controllers/media/uploadMedia.js";

const storage = multer.memoryStorage();
const upload = multer({ storage });

const mediaRouter = Router();

mediaRouter.post("/upload", upload.single("file"), uploadMedia)


export default mediaRouter;