const mongoose = require('mongoose');

// Represents a named subject owned by a user.
// One document per (userId, name) pair. Timetable slots live in the
// UserData config blob so they can change freely without cascading deletes.
const classSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // Optional foreign key to Term collection
    termId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Term',
      default: null,
    },
    // Starting balance manually entered for past lectures
    manualStats: {
      delivered: { type: Number, default: 0, min: 0 },
      attended:  { type: Number, default: 0, min: 0 },
      dl:        { type: Number, default: 0, min: 0 },
      ml:        { type: Number, default: 0, min: 0 },
    },
    // Kept for backward compat; not used by current routes
    schedule: { type: String, default: null },
    teacherId: { type: String, default: null },
  },
  { timestamps: true }
);

// Replaces Prisma's @@unique([userId, name]) and @@index([userId])
classSchema.index({ userId: 1, name: 1 }, { unique: true });
classSchema.index({ userId: 1 });

module.exports = mongoose.model('Class', classSchema);
