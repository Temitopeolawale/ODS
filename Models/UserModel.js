import mongoose from "mongoose"

const Schema = mongoose.Schema

const User = new Schema({
    email:{
        type :String ,
        required: true
    },
    password:{
        type: String ,
        required:true
    },
    verification_code:{
        type:Number,
        required:false
    },
    isVerified:{
        type:Boolean,
        default:false
    },
    reset_password_code: {
        type: Number
    },
    reset_password_expiry: {
        type: Date
    }
    
},{
    timestamps:true
})
const UserModel= mongoose.model("User",User)
export default UserModel
