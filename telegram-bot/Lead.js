const mongoose = require("mongoose");

const LeadSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Name is required"], trim: true },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    mobile: { type: String, required: [true, "Mobile number is required"], trim: true },
    telegramId: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Lead || mongoose.model("Lead", LeadSchema);
