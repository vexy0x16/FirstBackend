import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs';
import path from 'path';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// console.log("CLOUDINARY ENV:", {
//     cloud: process.env.CLOUDINARY_CLOUD_NAME,
//     key: process.env.CLOUDINARY_API_KEY,
//     secret: process.env.CLOUDINARY_API_SECRET ? "LOADED" : "MISSING",
// });

const uploadOnCloudinary = async (localFilePath) => {

    try {

        if(!localFilePath) return null;

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: 'auto',
        });

        //console.log("File uploaded successfully", localFilePath.url);

        fs.unlinkSync(localFilePath);
        
        return response;

        
    } catch (error) {
        if (localFilePath && fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
        console.error("Cloudinary upload error:", error);
        return null;
    }
}
export { uploadOnCloudinary };