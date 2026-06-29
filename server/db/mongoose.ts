import mongoose from "mongoose";

let connected = false;

export async function connectMongoDB(): Promise<void> {
  if (connected) return;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is not set");
  }

  await mongoose.connect(uri);
  connected = true;
  console.log("[mongodb] Connected to MongoDB");
}
