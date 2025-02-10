import express from "express"
import dotenv from "dotenv"
import bodyParser from "body-parser"
import cors from "cors"
import dbConnect from "../Config/dbConnet.js"
import userRouter from "../Router/UserRouter.js"
import imageAnalysis from "../Router/AnalysingRouter.js"

import morgan from "morgan"

dotenv.config()
const app = express()
dbConnect()
app.use(cors())
app.use(express.json())
app.use (bodyParser.json())
app.use(morgan('dev'))



//routes
app.use("/api/v1/user",userRouter)
app.use("/api/v1/analyse",imageAnalysis)

export default app