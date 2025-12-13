import mongoose from "mongoose";
import { DB_NAME } from "./constants.js";
import express from "express";
import dotenv from "dotenv";
dotenv.config({
    path: "./.env"
});

const app = express();
const PORT = process.env.PORT || 8000;
(async ()=>{

    try {
        await mongoose.connect(`${process.env.MONGO_URL}/${DB_NAME}`);
        console.log("MongoDB connected");
        
        app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        });

    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}) ()