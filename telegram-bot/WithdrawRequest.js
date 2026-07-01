const mongoose = require("mongoose");

const WithdrawRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Name shown on the withdrawal card sent to the Telegram group.
    // Defaults to the account holder's name if not explicitly provided.
    name: {
      type: String,
      trim: true,
      default: "",
    },
    // Short numeric-only reference code shown in the Telegram group message
    // and matched against OCR'd payment screenshots. Numeric-only because
    // OCR is far more reliable on pure digits than mixed hex strings.
    refCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    upiNumber: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "matched", "paid", "approved", "rejected"],
      default: "pending",
    },
    adminNote: {
      type: String,
      default: "",
    },
    reviewedAt: {
      type: Date,
    },
    // --- Telegram matching fields ---
    telegramGroupId: { type: String, default: "" },
    telegramMessageId: { type: Number },
    screenshotFileId: { type: String, default: "" },
    matchedAt: { type: Date },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.WithdrawRequest ||
  mongoose.model("WithdrawRequest", WithdrawRequestSchema);