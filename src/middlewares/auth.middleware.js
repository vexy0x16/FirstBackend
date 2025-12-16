import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiErrors.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {

    try {
        //1. get token from cookies
        const token = req.cookies.accessToken || 
            req.headers("Authorization")?.replace("Bearer ","");
    
        if(!token){
            throw new ApiError(401, "Not authorized, token missing");
        }
    
        //2. verify token
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    
        const user = await User.findById(decodedToken?._id).
            select("-password -refreshToken -createdAt -updatedAt");
    
        if(!user){
            throw new ApiError(401, "Not authorized, user not found");
        }
    
        //3. attach user to req object
        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401,error?.message ||"Not authorized, token invalid");
    }

});