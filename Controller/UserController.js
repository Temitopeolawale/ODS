import UserModel from "../Models/UserModel.js";
import asyncHandler from "express-async-handler";
import bycrypt from "bcryptjs";
import genToken from "../Utils/GenToken.js";
import { sendEmail } from "../Config/email.js";

function generateOTP(){
    return Math.floor(100000 + Math.random() * 900000)
}

export const CreateUser = asyncHandler(async (req, res) => {
    const email = req.body.email
    const password = req.body.password

    try {
        const emailExist = await UserModel.findOne({ email });

        if (emailExist) {
            return res.status(409).json({
                success: false,
                message: "User already exists"
            });
        }

        const salt = await bycrypt.genSalt(10);
        const hashedPassword = await bycrypt.hash(password, salt);

        const user = await UserModel.create({
            email,
            password: hashedPassword
        });

        let otp = generateOTP()

        user.verification_code = otp 
        await user.save()
        sendEmail(user.id ,otp,email)


        res.status(201).json({
            success: true,
            message: "User Created",
            user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "User not created"
        });
    }
});

export const verifyOtp = asyncHandler(
    async(req,res)=>{
        const email = req.body.email
        const otp = req.body.otp

        try {
            const userExist = await UserModel.findOne({email:email,verification_code:otp})

        if(!userExist){
            res.status(409).json({
                success:false,
                message:"Email does not exist",
            })
        }
         if (userExist.verification_code ==otp){
            await userExist.updateOne({isVerified :true})
            res.status(200).json({
                success:true,
                message:"Verification Successful ",
                data:{
                    verified:userExist.isVerified
                }
            })
        }

        } catch (error) {
            console.log(error.message)
        }
    }
)

export const UserLogin = asyncHandler(
    async(req,res)=>{
        const email = req.body.email
        const password = req.body.password 

        if(!email|| !password){
            res.status(400).json({
                success:false,
                message:"Enter Email or password  "
            })
        }
        try {
            const userFound = await UserModel.findOne({email:email})

            if(userFound.isVerified == true){
                if(userFound){
                    const isMatched = await bycrypt.compare(
                        password,
                        userFound.password
                    )
    
                    if(isMatched){
                        const token = genToken({id:userFound.id})
                        res.status(200).json({
                            success:true,
                            message:"User login succesful",
                            data:{
                                userId:userFound.id,
                                email:userFound.email,
                                token:token
                            }
                        })
                    }else {
                        res.status(400).json({
                            success:false,
                            message:"invalid password "
                        })
                    }
                }
            }
           else{
                res.status(400).json({
                    success:false,
                    message:"invalid credential "
                })
            }
        } catch (error) {
            console.log(error.message)
            res.send(400).json({
                success:false,
                message:error
            })
        }
    }
)

export const  GetUserProfie = asyncHandler(
    async(req,res)=>{
        const User = await UserModel.findById(req.userAuth.id)
        res.status(200).json({
            success:true,
            message:"Profie Page",
            data:{
                email:User.email
            }
        })
    }
)

export const ForgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    try {
        // Find the user by email
        const user = await UserModel.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Generate OTP for password reset
        const otp = generateOTP();

        // Save OTP and set expiry time (15 minutes from now)
        user.reset_password_code = otp;
        await user.save();

        // Send email with OTP
        sendEmail(user.id, otp, email, "Password Reset");

        res.status(200).json({
            success: true,
            message: "Password reset OTP sent to your email"
        });
    } catch (error) {
        console.log(error.message);
        res.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    }
});


export const ResetPassword = asyncHandler(async (req, res) => {
    const { email, otp, newPassword } = req.body;


    
    try {
        // Find user by email
        const user = await UserModel.findOne({ 
            email, 
            reset_password_code: otp,
           
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired OTP"
            });
        }

        // Hash the new password
        const salt = await bycrypt.genSalt(10);
        const hashedPassword = await bycrypt.hash(newPassword, salt);

       
        user.password = hashedPassword;
        user.reset_password_code = otp;
       
        await user.save();

        res.status(200).json({
            success: true,
            message: "Password reset successful"
        });
    } catch (error) {
        console.log(error.message);
        res.status(500).json({
            success: false,
            message: "password not changed "
        });
    }
});