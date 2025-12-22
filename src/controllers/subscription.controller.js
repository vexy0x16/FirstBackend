import mongoose, {isValidObjectId, Types} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription
    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channelId");
    }

    if (channelId === req.user._id.toString()) {
        throw new ApiError(400, "You cannot subscribe to your own channel");
    }

    const channelExists = await User.findById(channelId);
    if (!channelExists) {
        throw new ApiError(404, "Channel not found");
    }

    const existingSubscription = await User.findOne({
        subscriber: req.user._id,
        channel: channelId
    });

    if(existingSubscription){
        await existingSubscription.deleteOne();

        return res.status(200)
        .json(
            new ApiResponse(200,{ subscribed: false }, "Unsubscribed successfully")
        );
    }

    await Subscription.create({
        subscriber: req.user._id,
        channel: channelId
    });

    res.status(200)
    .json(
        new ApiResponse(200, { subscribed: true }, "Subscribed successfully")
    );
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channelId");
    }

    const subscriber = await Subscription.aggregate([
        {
            $match:{
                channel : new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from : "users",
                localField: "subscriber",
                foreignField:"_id",
                as: "subscriber",
                pipeline:[
                    {
                        $project:{
                            username: 1,
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        { $unwind: "$subscriber" }
    ]);

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            {
                subscribers,
                totalSubscribers: subscribers.length
            },
            "Subscribers fetched successfully"
        )
    );
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params

    if (!isValidObjectId(subscriberId)) {
        throw new ApiError(400, "Invalid subscriberId");
    }

    const channels = await Subscription.aggregate([
        {
            $match:{
                subscriber : new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup:{
                from:"users",
                localField: "channel",
                foreignField:"_id",
                as:"channel",
                pipeline:[
                    {
                        $project:{
                            username: 1,
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        { $unwind: "$channel" }
    ]);

    return res.status(200)
    .json(
        new ApiResponse ( 200, 
            {
                channels,
                totalChannels: channels.length
            },
            "Subscribed channels fetched successfully"
        )
    );
});

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}