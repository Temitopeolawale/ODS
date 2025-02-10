import jwt from "jsonwebtoken"


export const Token =(token)=>{
    return jwt.verify(token,process.env.JWT,(err,decoded)=>{
        if(err){
            return false
        }
        else{
            return decoded
        }
    })
}