import mongoose from "mongoose";

export async function connectToDatabase(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn("[database] MONGODB_URI not set — auth features will be unavailable");
    return;
  }
  try {
    await mongoose.connect(uri);
    console.log("[database] Connected to MongoDB");
  } catch (err) {
    console.error("[database] MongoDB connection failed:", err);
  }
}

export function isMongoConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
