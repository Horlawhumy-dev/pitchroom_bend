import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  fullName: string;
  workEmail: string;
  password?: string;
  isVerified: boolean;
  onboardingStatus: "pending" | "completed";
  onboardingData?: any;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    fullName: { type: String, required: true },
    workEmail: { type: String, required: true, unique: true },
    password: { type: String },
    isVerified: { type: Boolean, default: false },
    onboardingStatus: {
      type: String,
      enum: ["pending", "in_progress", "completed"],
      default: "pending",
    },
    onboardingData: { type: Schema.Types.Mixed, default: null },
    role: { type: String, default: "user" },
  },
  { timestamps: true },
);

export const User = mongoose.model<IUser>("User", userSchema);
