import jwt from "jsonwebtoken"

const genToken=(id)=>{
    return jwt.sign({id},process.env.JWT,{expiresIn:"10h"})
}

export default genToken