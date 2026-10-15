import mongoose from "mongoose";

export async function connectDB() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing. Add it to backend/.env");
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");
}
