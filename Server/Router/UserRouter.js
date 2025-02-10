import { Router } from "express";
import { CreateUser } from "../Controller/UserController.js";
const router = Router()

router.post("/register",CreateUser)

export default router