import  { Novu } from "@novu/node"
import dotenv from "dotenv"

dotenv.config()

const novu = new Novu(
 process.env.NOVU_SECRET_KEY
)

export const  sendEmail = async(userID,otp,email) =>{
    try {
       await novu.trigger(
            'one-time-password',{
                to:{
                    subscriberId:userID,
                    email:email
                },
                payload:{
                    otp:otp
                }
            }
            
        )
    } catch (error) {
        console.log("error:",error.message)
    }
}