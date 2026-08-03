const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    // Password-reset fields — null when no reset is pending.
    // The token stored here is a SHA-256 hash of the raw token sent in the email,
    // so a stolen DB dump can't be used to reset passwords directly.
    passwordResetToken:  { type: String, default: null },
    passwordResetExpiry: { type: Date,   default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
