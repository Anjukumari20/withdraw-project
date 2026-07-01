const mongoose = require("mongoose");

const TelegramMessageSchema = new mongoose.Schema(
  {
    chatId: { type: String, required: true },
    chatTitle: { type: String, default: "" },
    fromUserId: { type: String, default: "" },
    fromUsername: { type: String, default: "" },
    text: { type: String, default: "" },
    messageId: { type: Number },
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.TelegramMessage ||
  mongoose.model("TelegramMessage", TelegramMessageSchema);
