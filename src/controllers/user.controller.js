import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/apiErrors.js";
import {User} from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiRespones.js";
import path from "path";
import jwt from "jsonwebtoken";

const generateAccessTokenAndRefreshToken = async (userId) => {
        try {
            const user = await User.findById(userId);
            const accessToken = user.generateAccessToken();
            const refreshToken = user.generateRefreshToken();

            user.refreshToken = refreshToken;
            await user.save({validateBeforeSave: false});

            return {accessToken, refreshToken};
            
        } catch (error) {
            
            throw new ApiError(500, "Token generation failed");
            
        }
};

const registerUser = asyncHandler(async (req, res, next) => {
    // get user data from frontend
    // validation - not empty
    // check if user already exists - email, username
    //check for images , avatar
    //upload them to cloudinary
    //create user object and save to db
    //remove password and refresh token from response
    //check for user creation success and send response
    //return response

    const {username,email,password,fullName} = req.body;
     
//    console.log("registered email ", email );
    
    //2. validation
    if([username,email,password,fullName].some(field => field?.trim() === ""))
    {
        throw new ApiError(400, "All fields are required");
    }

    //3. check if user already exists
    const existedUser = await User.findOne({
        $or: [{email}, {username}
        ]
    });
    if(existedUser){
        throw new ApiError(409, "User already exists with this email or username");
    }

    //4. check for images and avatar
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
    // console.log("Avatar local path", avatarLocalPath);
    // console.log("Cover Image path",coverImageLocalPath);
    
    
    const avatarPath = avatarLocalPath
    ? path.resolve(avatarLocalPath)
    : null;
//    console.log("avatar path",avatarPath);
    
    if (!avatarPath) {
    throw new ApiError(400, "Avatar is required");
    }

    const avatar = await uploadOnCloudinary(avatarPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
//    console.log("avatar",avatar);
    

    if (!avatar) {
    throw new ApiError(500, "Avatar upload failed");
}
console.log("REQ.FILES:", req.files);


    //6. create user object and save to db
    const user = await User.create({
        username: username.toLowerCase(),
        email,  
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        fullName
    });

    //7. remove password and refresh token from response
    const userCreated = await User.findById(user._id).select(
        "-password -refreshToken -createdAt -updatedAt"
    );

    if(!userCreated){
        throw new ApiError(500, "User registration failed");
    }

    //8. send response
    return res.status(201).json(
        new ApiResponse(201, userCreated, "User registered successfully") 
    );
});

const loginUser = asyncHandler(async (req, res, next) => {

    //req.body - data
    //validation
    //check if user exists
    //compare password
    //generate tokens
    //save refresh token in db
    //send response

    //1. get data from req.body
    const {email,username,password} = req.body;

    //2. validation
    if(!(email || username)){ 
        throw new ApiError(400, "Username or email is required");
    }

    //3. check if user exists
    const user = await User.findOne({
        $or: [{email}, {username}]
    });

    if(!user){
        throw new ApiError(404, "User does not exist");
    }

    //4. compare password
    const isPasswordValid = await user.comparedPassword(password);

    if(!isPasswordValid){
        throw new ApiError(401, "Invalid password");
    }

    
    //5. save refresh token in db
    const {accessToken, refreshToken} = await generateAccessTokenAndRefreshToken(user._id);

    //6. send response
    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken -createdAt -updatedAt"
    );

    const options = {
        httpOnly: true,
        secure: true
    };

    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(200,
            {
                user:loggedInUser,accessToken,refreshToken,
            },
            "User logged in successfully"
        )
    );
});

const logOutUser = asyncHandler(async (req, res, next) => {
    //get user from req
    //clear refresh token from db
    //clear cookies
    //send response

    await User.findByIdAndUpdate(req.user._id,
        {
            $unset : {refreshToken: 1}
        },
        {
            new : true,
        }
    );

    const options = {
        httpOnly: true,
        secure: true,
        //expires: new Date(0)
    };
    //clear cookiees


    return res.status(200)
    .cookie("accessToken","", options)
    .cookie("refreshToken", "", options)
    .json(
        new ApiResponse(200, null, "User logged out successfully")
    );

});

const refreshAccessToken = asyncHandler(async (req, res, next) => {
    //1. get refresh token from cookies
    const incomingRefreshToken = req.cookies?.refreshToken|| req.body?.refreshToken;
    
    if(!incomingRefreshToken){
        throw new ApiError(401, "Refresh token missing");
    }   

    //2. verify refresh token
    try {
        const decodedToken = jwt
        .verify(incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );
    
        const user = await User.findById(decodedToken?._id);
    
        if(!user){
            throw new ApiError(401, "Invalid refresh token");
        }
    
        if(user.refreshToken !== incomingRefreshToken){
            throw new ApiError(401, "Refresh token mismatch, login again");
        }

        const options = {
            httpOnly: true,
            secure: true
        };
    
        //3. generate new access token
        const { accessToken, newRefreshToken } = await generateAccessTokenAndRefreshToken(user._id);
    
        return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(200,
                {accessToken,newRefreshToken},
                "Access token refreshed successfully"
            )
        );
    } catch (error) {
        throw new ApiError(401,error.message || "Invalid refresh token");
        
    }
});

const changeCurrentPassword = asyncHandler(async (req,res,next)=>{
    const {oldPassword, newPassword} = req.body;
     const user = await User.findById(req.user?._id)
    const isPasswordValid = await user.comparedPassword(oldPassword);


    if(!isPasswordValid){
        throw new ApiError(401, "Invalid password");
    }

    user.password = newPassword;
    await user.save({validateBeforeSave:false});

    return res.status(200)
    .json(
        new ApiResponse(200, null, "Password updated successfully") 
    )
});

const getCurrentUser = asyncHandler(async (req,res,next)=>{
    return res.status(200)
    .json(
        new ApiResponse(200, req.user, "Current user fetched successfully")
    )
});

const updateAccountDetails = asyncHandler(async (req,res,next)=>{
    //get user from req
    //get data from req.body

    const {fullName, email} = req.body;

    if(!fullName || !email){
        throw new ApiError(400, "Full name and email are required");
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                fullName,
                email
            }
        },
        {new: true}
    ).select("-password -refreshToken -createdAt -updatedAt");

    return res.status(200)
    .json(
        new ApiResponse(200, updatedUser, "Account details updated successfully")
    );
});

const updateUserAvatar = asyncHandler(async (req,res,next)=>{
    //get user from req
    //get avatar from req.file
    //upload to cloudinary
    //update user avatar in db
    //send response

    const avatarLocalPath = req.file?.path;

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar image is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if(!avatar.url){
        throw new ApiError(500, "Avatar upload failed");
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password -refreshToken -createdAt -updatedAt");

    return res.status(200)
    .json(
        new ApiResponse(200, updatedUser, "Avatar updated successfully")
    );
});

const updateUserCoverImage = asyncHandler(async (req,res,next)=>{
    //get user from req
    //get avatar from req.file
    //upload to cloudinary
    //update user avatar in db
    //send response

    const coverImageLocalPath = req.file?.path;

    if(!coverImageLocalPath){
        throw new ApiError(400, "Cover image is required");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!coverImage.url){
        throw new ApiError(500, "Cover image upload failed");
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password -refreshToken -createdAt -updatedAt");

    return res.status(200)
    .json(
        new ApiResponse(200, updatedUser, "Cover image updated successfully")
    );
});

const getUserChannelProfile = asyncHandler(async (req,res,next)=>{
    //get user id from req.params
    //get user from db
    //send response

    const {username} = req.params;

    if(!username?.trim()){
        throw new ApiError(400, "Username is required");
    }

    const channelUser = await User.aggregate([
        {
            $match: {
                username : username.toLowerCase()
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount: {$size: "$subscribers"},
                subscribedToCount: {$size: "$subscribedTo"},
                isSubscribed: {
                    $cond:{
                        if:{ 
                            $and: [
                                { $ne: [req.user?._id, null] },
                                { $in: [req.user?._id, "$subscribers.subscriber"] }
                            ]
                        },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project:{
                username:1,
                fullName:1,
                avatar:1,
                coverImage:1,
                subscribersCount:1,
                subscribedToCount:1,
                isSubscribed:1
            }
        }
    ]);

    if (!channelUser.length) {
        throw new ApiError(404, "Channel not found");
    };

    return res.status(200)
    .json(
        new ApiResponse(200, channelUser[0], "Channel profile fetched successfully")
    );
});

const getUserWatchHistory = asyncHandler(async (req,res,next)=>{
    //get user from req

    const user = await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup:{
                from : "videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        username:1,
                                        fullName:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ]);

    return res.status(200)
    .json(
        new ApiResponse(200, user[0]?.watchHistory || [],
             "User watch history fetched successfully")
    )
});

export {
    registerUser, 
    loginUser, 
    logOutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getUserWatchHistory
};