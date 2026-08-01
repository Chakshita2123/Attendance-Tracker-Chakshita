const mongoose = require('mongoose');

// Per-user configuration blob: timetable, historicalAttendance, phase,
// lectureSettings. Does NOT store attendance records (those are relational).
// version is used for optimistic concurrency — two open tabs can't silently
// clobber each other's settings.
const userDataSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    // Stores the config blob as a plain JS object (Mixed).
    // No need to JSON.stringify/parse — Mongoose handles serialization.
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    version: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('UserData', userDataSchema);
