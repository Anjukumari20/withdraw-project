import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    // Mock balance only — no real blockchain/crypto integration.
    balance: {
      type: Number,
      default: 100000, // seeded mock USDT balance
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
