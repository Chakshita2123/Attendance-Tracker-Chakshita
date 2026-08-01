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
