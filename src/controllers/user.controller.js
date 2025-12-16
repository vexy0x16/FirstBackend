import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/apiErrors.js";
import {User} from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiRespones.js";
import path from "path";


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
    if(!email || !username){ 
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
            $set : {refreshToken: undefined}
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

    return res.status(200)
    .cookie("accessToken", options)
    .cookie("refreshToken", options)
    .json(
        new ApiResponse(200, null, "User logged out successfully")
    );

});

export {
    registerUser, 
    loginUser, 
    logOutUser
};