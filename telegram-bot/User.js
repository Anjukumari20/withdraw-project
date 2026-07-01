const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    balance: Number,
    isAdmin: Boolean,
  },
  { timestamps: true }
);

module.exports = mongoose.models.User || mongoose.model("User", UserSchema);