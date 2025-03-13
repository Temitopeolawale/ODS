import { Router } from "express";
import { analyzeImage} from "../Controller/AnalyzingController.js";
import upload from "../Config/fileUpload.js";
import { loggedIn } from "../Middleware/isLoggedIn.js";
import { verifyThreadOwnership } from "../Middleware/ThreadOwnership.js";
const router = Router()

router.post("/analysingImage",loggedIn,upload.single("image"),verifyThreadOwnership,analyzeImage)


export default router