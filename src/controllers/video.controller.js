import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
    
    const match = {isPublished : true};

    // Add search filter to match documents where title or description contains the query text

    if(query){
        match?.$or = [
            {title: {$regex: query, $options: "i"}},
            {description:{$regex: query, $options: "i"}}
        ];
    }

    if(userId){
        if(!isValidObjectId(userId)){
            throw new ApiError (400, "Invalid user Id");
        }
    }

    // Dynamically set sort field and order (asc = 1, desc = -1)

    const sortOptions = {
        [sortBy]: sortType === "asc" ? 1 : -1 
    };

    const videos = await Video.aggregate([
        {$match : match},
        {$sort: sortOptions},
        {$skip:(Number(page)-1) * (Number(limit))},
        {$limit:Number(limit)},
        {
            $lookup:{
                from: "users",
                localField: "owner",
                foreignField:"_id",
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
        {$unwind: "owner"}
    ]);

    const totalVideos = await Video.countDocuments(match);

    return res.status(200)
    .json(
        new ApiResponse(200, {
            videos,
            totalVideos,
            currentPage: Number(page),
            totalPages: Math.ceil(totalVideos / limit)
        })
    )

});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video

    if(!(title || description)){
        throw new ApiError(400,"Title and description are required")
    }

    const videoLocalPath = req.files?.video?.[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

    if(!videoLocalPath || !thumbnailLocalPath){
        throw new ApiError(400, "Video and thumbnail is required");
    }

    const videoUpload = await uploadOnCloudinary(videoLocalPath);
    const thumbnailUpload = await uploadOnCloudinary(thumbnailLocalPath);

    if(! videoUpload.url){
        throw new ApiError(500,"Video upload failed")
    }

    const video = await Video.create({
        title,
        description,
        videoFile: videoUpload.url,
        thumbnail: thumbnailUpload.url,
        owner: req.user._id,
        isPublished: true
    });

    return res.status(200)
    .json(
        new ApiResponse(
            200,{video: video} ,"Video uploaded successfully"
        )
    );

});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id

    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid video Id");
    }

    const video = await Video.findById(videoId).populate(
        "owner",
        "username fullName avatar"
    );

    if(!video){
        throw new ApiError(404, "Video not found")
    }

    return res.status(200)
    .json(
        new ApiResponse(200, "Video fetched successfully")
    );

});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { title, description } = req.body;
    //TODO: update video details like title, description, thumbnail

    const video = await Video.findById(videoId);

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Not authorized to update this video");
    }

    if (title) video.title = title;
    if (description) video.description = description;

    if (req.file?.path) {
        const thumbnailUpload = await uploadOnCloudinary(req.file.path);
        video.thumbnail = thumbnailUpload.url;
    }

    await video.save();

    res.status(200).json(
        new ApiResponse(200, video, "Video updated successfully")
    );

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Not authorized to delete this video");
    }

    await video.deleteOne();

    res.status(200).json(
        new ApiResponse(200, {}, "Video deleted successfully")
    );
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Not authorized");
    }

    video.isPublished = !video.isPublished;
    await video.save();

    res.status(200).json(
        new ApiResponse(
            200,
            { isPublished: video.isPublished },
            "Publish status updated"
        )
    );
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}