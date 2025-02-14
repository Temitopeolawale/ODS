import { verifyToken } from "../Utils/verifyToken.js";
import { tokenHeader } from "../Utils/tokenHeader.js"


export const loggedIn = (req,res,next)=>{
    //getting token from the header 
    const token = tokenHeader(req)
    // verify the token  
    const verifyUser = verifyToken(token)
    //saving the user 
    if(!verifyUser){
        return res.status(409).json({
            success:false,
            message:"invalid token /  please login in again"
        })
    }
    else {
        req.userAuth = verifyUser.id
        next()
    }
}