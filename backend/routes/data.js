const express = require('express');
const router = express.Router();
const Class = require('../models/Class');
const Attendance = require('../models/Attendance');
const UserData = require('../models/UserData');
const { requireAuth } = require('../auth');

// ── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_TIMETABLE = {
  Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [],
};

const DEFAULT_LECTURE_SETTINGS = { durationMinutes: 60 };

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse a date string (YYYY-MM-DD) to a midnight-UTC Date object.
 * Returns null for invalid strings.
 */
function toMidnightUTC(dateStr) {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Format a Date object back to YYYY-MM-DD (local calendar date in UTC).
 */
function toDateStr(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Assemble the full data shape from relational collections + config blob.
 * This is the single source of truth for the GET /api/data response.
 */
async function assembleUserData(userId) {
  const [classes, attendanceRows, userData] = await Promise.all([
    Class.find({ userId }).sort({ name: 1 }),
    Attendance.find({ userId }).populate('classId').sort({ date: 1 }),
    UserData.findOne({ userId }),
  ]);

  // subjects: deduplicated list of subject names from Class documents
  const subjects = classes.map(c => c.name);

  // manualStats: map of subjectName -> { delivered, attended, dl, ml } directly from Class documents
  const manualStats = {};
  classes.forEach(c => {
    manualStats[c.name] = {
      delivered: c.manualStats?.delivered || 0,
      attended:  c.manualStats?.attended  || 0,
      dl:        c.manualStats?.dl        || 0,
      ml:        c.manualStats?.ml        || 0,
    };
  });

  // Build classId (ObjectId string) → name lookup for attendance assembly
  const classNameById = Object.fromEntries(classes.map(c => [c._id.toString(), c.name]));

  // attendance + dailyLog: { "YYYY-MM-DD": { SUBJECT: "P"|"A"|"L" } }
  const attendance = {};
  const dailyLog   = {};
  for (const row of attendanceRows) {
    const dateStr     = toDateStr(row.date);
    const subjectName = classNameById[row.classId._id?.toString() ?? row.classId.toString()]
                        ?? row.classId?.name;
    if (!subjectName) continue;

    if (!attendance[dateStr]) attendance[dateStr] = {};
    if (!dailyLog[dateStr])   dailyLog[dateStr]   = {};
    attendance[dateStr][subjectName] = row.status;
    dailyLog[dateStr][subjectName]   = row.status;
  }

  // Config blob (stored as a plain Mixed object — no JSON.parse needed)
  const config = userData ? (userData.data || {}) : {};

  return {
    subjects,
    timetable:            config.timetable            || DEFAULT_TIMETABLE,
    attendance,
    dailyLog,
    historicalAttendance: config.historicalAttendance || {},
    manualStats:          Object.keys(manualStats).length > 0 ? manualStats : (config.manualStats || {}),
    phase:                config.phase                || 'setup',
    lectureSettings:      config.lectureSettings      || DEFAULT_LECTURE_SETTINGS,
    _version:             userData?.version           ?? 0,
  };
}

// ── GET /api/data ─────────────────────────────────────────────────────────────

router.get('/', requireAuth, async (req, res) => {
  try {
    const payload = await assembleUserData(req.user.id);
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

// ── POST /api/data ────────────────────────────────────────────────────────────
//
// Accepts the full data blob from the frontend. Saves:
//   • subjects     → Class documents (upsert per subject, delete removed subjects)
//   • attendance   → Attendance documents (upsert per day/subject)
//   • everything else (timetable, historicalAttendance, phase, lectureSettings)
//                  → UserData config blob with optimistic concurrency check
//
// Optimistic concurrency:
//   The response from GET /api/data includes _version (the UserData.version field).
//   POST must echo this back in the body. If another tab incremented version
//   between GET and POST, we return 409 Conflict instead of silently overwriting.
//   Missing _version (e.g. old client) is treated as 0 — backward compatible.

router.post('/', requireAuth, async (req, res) => {
  const { data } = req.body;
  if (!data) return res.status(400).json({ error: 'data required' });

  const userId        = req.user.id;
  const clientVersion = typeof data._version === 'number' ? data._version : 0;

  const {
    subjects            = [],
    attendance          = {},
    timetable           = DEFAULT_TIMETABLE,
    historicalAttendance = {},
    manualStats         = {},
    phase               = 'setup',
    lectureSettings     = DEFAULT_LECTURE_SETTINGS,
    dailyLog            = {},
    // _version is extracted above but not spread into configBlob
  } = data;

  try {
    // ── 1. Upsert Class documents for every subject ───────────────────────────
    for (const name of subjects) {
      const ms = manualStats[name] || {};
      const statsObj = {
        delivered: Math.max(0, parseInt(ms.delivered, 10) || 0),
        attended:  Math.max(0, parseInt(ms.attended, 10) || 0),
        dl:        Math.max(0, parseInt(ms.dl, 10) || 0),
        ml:        Math.max(0, parseInt(ms.ml, 10) || 0),
      };

      await Class.findOneAndUpdate(
        { userId, name },
        {
          $setOnInsert: { userId, name },
          $set: { manualStats: statsObj },
        },
        { upsert: true, new: true }
      );
    }

    // ── 2. Remove Class documents (and their Attendance) for deleted subjects ─
    const existingClasses = await Class.find({ userId });
    const deletedClasses  = existingClasses.filter(c => !subjects.includes(c.name));
    if (deletedClasses.length > 0) {
      const deletedIds = deletedClasses.map(c => c._id);
      // Delete attendance records for removed classes first
      await Attendance.deleteMany({ classId: { $in: deletedIds }, userId });
      await Class.deleteMany({ _id: { $in: deletedIds }, userId });
    }

    // ── 3. Build classId lookup ───────────────────────────────────────────────
    const currentClasses = await Class.find({ userId });
    const classIdByName  = Object.fromEntries(currentClasses.map(c => [c.name, c._id]));

    // ── 4. Upsert Attendance documents ────────────────────────────────────────
    const validStatuses = new Set(['P', 'A', 'L']);
    for (const [dateStr, dayMarks] of Object.entries(attendance)) {
      const date = toMidnightUTC(dateStr);
      if (!date) continue;

      for (const [subjectName, status] of Object.entries(dayMarks)) {
        if (!validStatuses.has(status)) continue;
        const classId = classIdByName[subjectName];
        if (!classId) continue;

        await Attendance.findOneAndUpdate(
          { userId, classId, date },
          { $set: { status } },
          { upsert: true }
        );
      }
    }

    // ── 5. Optimistic concurrency check for config blob ───────────────────────
    const currentData    = await UserData.findOne({ userId });
    const currentVersion = currentData?.version ?? 0;

    if (currentData && clientVersion !== currentVersion) {
      return res.status(409).json({
        error:   'conflict',
        message: 'Your settings were modified in another tab. Please reload to get the latest data.',
        serverVersion: currentVersion,
        clientVersion,
      });
    }

    // ── 6. Upsert config blob ─────────────────────────────────────────────────
    const configBlob = {
      timetable,
      historicalAttendance,
      manualStats,
      phase,
      lectureSettings,
      dailyLog,
      subjects,   // kept in blob as a debug-friendly mirror of Class documents
    };

    if (currentData) {
      // Update: increment version atomically
      // markModified is required because Mongoose doesn't track changes to Mixed fields
      currentData.data = configBlob;
      currentData.markModified('data');
      currentData.version = currentVersion + 1;
      await currentData.save();
    } else {
      // Create: first-time save for this user
      await UserData.create({ userId, data: configBlob, version: 1 });
    }

    res.json({ message: 'Data saved successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save data: ' + err.message });
  }
});

module.exports = router;
