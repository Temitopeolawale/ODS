import UserModel from "../Models/UserModel.js";
import asyncHandler from "express-async-handler";
import bycrypt from "bcryptjs";


export const CreateUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

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

export const UserLogin = asyncHandler(
    async(req,res)=>{
        const {email, password }= req.body 
        if(!email|| !password){
            res.status(400).json({
                success:false,
                message:"Enter Email or password  "
            })
        }
        try {
            const userExist = await UserModel.findOne({email})

            if(userExist && await bycrypt.compare(password,userExist.password)){
                res.status(200).json({
                    success:true,
                    message:"Login successfull",
                    data:{
                        userId:userExist.id,
                        email:userExist.email,
                        token:token
                    }
                })
            }

        } catch (error) {
            
        }
    }
)

export const  GetUserProfie = asyncHandler(
    async(req,res)=>{
        const User = await UserModel.findById()

        res.status(200).json({
            success:true,
            message:"Profie Page",
            data:{
                email:User.email
            }
        })
    }
)