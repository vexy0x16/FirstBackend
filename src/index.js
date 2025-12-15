import dotenv from "dotenv";
dotenv.config({ path: "./.env" });
import connectDB from "./db/index.js";
import app from "./app.js";

connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000, ()=>{
        console.log(`\n Server is running on PORT: ${process.env.PORT || 8000}`);
    })
})
.catch((err)=>{
    console.log("MONGODB connection failed!!!", err);
    process.exit(1)
})