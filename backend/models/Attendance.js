const mongoose = require('mongoose');

// One attendance record per user per subject per calendar day.
// status: "P" (Present), "A" (Absent), "L" (Late)
const attendanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
    },
    // Stored as midnight UTC: 2025-07-01T00:00:00.000Z
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['P', 'A', 'L'],
      required: true,
    },
  },
  { timestamps: true }
);

// Replaces Prisma's @@unique([userId, classId, date]) and @@index([userId])
attendanceSchema.index({ userId: 1, classId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ userId: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
