import mongoose, { Schema, Document } from "mongoose";

export type UserRole = "masterAdmin" | "normalUser";

export const ALL_SECTIONS = [
  "designer",
  "projects",
  "simulation",
  "visualization",
  "outputRequests",
  "flexTable",
  "excelIO",
  "networkSettings",
] as const;

export type SectionKey = typeof ALL_SECTIONS[number];

export interface IUser extends Document {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  sectionAccess: SectionKey[];
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["masterAdmin", "normalUser"], default: "normalUser" },
  sectionAccess: { type: [String], default: [...ALL_SECTIONS] },
  createdAt: { type: Date, default: Date.now },
});

export const User = mongoose.model<IUser>("User", UserSchema);
