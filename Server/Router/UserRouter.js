import { Router } from "express";
import { CreateUser, GetUserProfie, UserLogin, verifyOtp } from "../Controller/UserController.js";
import { loggedIn } from "../Middleware/isLoggedIn.js";
const router = Router()

router.post("/register",CreateUser)
router.post("/verify",verifyOtp)
router.post("/login",UserLogin)
router.get("/profile",loggedIn,GetUserProfie)

export default router