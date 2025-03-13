import express from "express"
import dotenv from "dotenv"
import bodyParser from "body-parser"
import cors from "cors"
import dbConnect from "../Config/dbConnet.js"
import userRouter from "../Router/UserRouter.js"
import imageAnalysis from "../Router/AnalysingRouter.js"
import sessionRouter from "../Router/SessionRouter.js"

import morgan from "morgan"

dotenv.config()
const app = express()
dbConnect()
app.use(cors(
    {
        origin: 'http://localhost:5173',
        credentials: true
      }
))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use (bodyParser.json())
app.use(morgan('dev'))



//routes
app.use("/api/v1/user",userRouter)
app.use("/api/v1/analyse",imageAnalysis)
app.use("/api/v1/session",sessionRouter)

export default app