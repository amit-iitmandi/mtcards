const mongoose = require("mongoose");
// const Schema = mongoose.Schema

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  setupTokenHash: { type: String, select: false },
  setupExpiresAt: { type: Number, select: false },
  date: {
    type: Date,
    default: Date.now,
  },
});

mongoose.model("User", userSchema);
