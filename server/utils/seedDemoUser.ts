import bcrypt from "bcryptjs";
import { User } from "../models/User";

export async function seedDemoUser(): Promise<void> {
  try {
    const email = "demo@example.com";
    const existing = await User.findOne({ email });
    if (existing) return;

    const hashed = await bcrypt.hash("Demo@123", 12);
    await User.create({ fullName: "Demo User", email, password: hashed });
    console.log("[seed] Demo user created: demo@example.com / Demo@123");
  } catch (err) {
    console.error("[seed] Failed to seed demo user:", err);
  }
}
