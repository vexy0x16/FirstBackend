import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/apiErrors.js";
import {User} from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiRespones.js";
import path from "path";
import { log } from "console";

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
     
    console.log("registered email ", email );
    
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
    console.log("Avatar local path", avatarLocalPath);
    console.log("Cover Image path",coverImageLocalPath);
    
    
    const avatarPath = avatarLocalPath
    ? path.resolve(avatarLocalPath)
    : null;
    console.log("avatar path",avatarPath);
    
    if (!avatarPath) {
    throw new ApiError(400, "Avatar is required");
    }

    const avatar = await uploadOnCloudinary(avatarPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    console.log("avatar",avatar);
    

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
export {registerUser};