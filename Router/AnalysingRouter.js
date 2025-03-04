import { Router } from "express";
import { analyzeImage, userQuestions } from "../Controller/AnalyzingController.js";
import upload from "../Config/fileUpload.js";
const router = Router()

router.post("/analysingImage",upload.single("image"),analyzeImage)
router.post("/chat",userQuestions)

export default router