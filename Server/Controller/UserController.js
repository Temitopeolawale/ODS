import UserModel from "../Models/UserModel.js";
import asyncHandler from "express-async-handler";
import bycrypt from "bcryptjs";
import genToken from "../Utils/GenToken.js";



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
        const email = req.body.email
        const password = req.body.password 

        if(!email|| !password){
            res.status(400).json({
                success:false,
                message:"Enter Email or password  "
            })
        }
        try {
            const existingUser = await UserModel.findOne({email:email})

            if(existingUser){
                const isMatched = await bycrypt.compare(
                    password,
                    existingUser.password
                )

                if(isMatched){
                    const token = genToken({id:existingUser.id})
                    res.status(200).json({
                        success:true,
                        message:"User login succesful",
                        data:{
                            userId:existingUser.id,
                            email:existingUser.email,
                            token:token
                        }
                    })
                }else {
                    res.status(400).json({
                        success:false,
                        message:"invalid password "
                    })
                }
            }else{
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