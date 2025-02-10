import mongoose from "mongoose"

const Schema = mongoose.Schema

const User = new Schema({
    username :{
        type:String,
        required:true
    },
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
        required:true
    },
    verified:{
        type:Boolean,
        default:false
    },
    
    
},{
    timestamps:true
})
const UserModel= mongoose.model("User",User)
export default UserModel
