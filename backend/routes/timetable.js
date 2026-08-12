const express = require('express');
const router = express.Router();
const fs = require('fs');
const formidable = require('formidable');

const VALID_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DAY_MAP = {
  monday: 'Mon', mon: 'Mon', m: 'Mon',
  tuesday: 'Tue', tue: 'Tue', t: 'Tue',
  wednesday: 'Wed', wed: 'Wed', w: 'Wed',
  thursday: 'Thu', thu: 'Thu', th: 'Thu',
  friday: 'Fri', fri: 'Fri', f: 'Fri',
  saturday: 'Sat', sat: 'Sat', s: 'Sat',
  sunday: 'Sun', sun: 'Sun',
};

function normalizeDay(dStr) {
  if (!dStr) return null;
  const clean = String(dStr).trim().toLowerCase();
  return DAY_MAP[clean] || null;
}

function normalizeTime(tStr) {
  if (!tStr) return '09:00';
  const clean = String(tStr).trim();
  const match = clean.match(/(\d{1,2})[:.](\d{2})\s*(am|pm)?/i);
  if (match) {
    let hrs = parseInt(match[1], 10);
    const mins = match[2];
    const ampm = match[3] ? match[3].toLowerCase() : null;
    if (ampm === 'pm' && hrs < 12) hrs += 12;
    if (ampm === 'am' && hrs === 12) hrs = 0;
    return `${String(hrs).padStart(2, '0')}:${mins}`;
  }
  return '09:00';
}

/**
 * Call Gemini Vision API to analyze image/PDF buffer and return parsed schedule JSON
 */
async function callGeminiVisionAPI(base64Data, mimeType) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the backend environment.');
  }

  const promptText = `
You are an expert academic timetable OCR parser.
Examine the provided timetable file (image or PDF) and extract all subject names, days of the week, start times, and lecture durations.

CRITICAL INSTRUCTIONS:
1. Extract all unique subject names found in the timetable as a clean array of strings in uppercase (e.g. ["MATHS", "PHYSICS", "CHEMISTRY"]).
2. For each scheduled class slot in the timetable grid, extract:
   - "day": Must be one of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].
   - "start": Start time in 24-hour HH:MM format (e.g. "09:00", "14:30").
   - "duration": Duration of the lecture in minutes as an integer (default 60 if not specified).
   - "subject": The single subject name if clearly determined, OR null if ambiguous/elective.
   - "isAmbiguous": true if the slot contains multiple subject options or elective choices (e.g. "AOC / BPC", "ELECTIVE-1 / ELECTIVE-2", "LAB A / LAB B"), otherwise false.
   - "options": An array of subject option strings if ambiguous (e.g. ["AOC", "BPC"]), otherwise empty array [].
   - "rawText": The exact text in the cell if ambiguous or unclear.

3. Return ONLY a valid, raw JSON object (no markdown, no backticks, no explanations) matching this exact schema:
{
  "subjects": ["PHYSICS", "MATHS", "AOC", "BPC"],
  "timetable": [
    {
      "day": "Mon",
      "start": "09:00",
      "duration": 60,
      "subject": "PHYSICS",
      "isAmbiguous": false,
      "options": []
    },
    {
      "day": "Wed",
      "start": "11:00",
      "duration": 60,
      "subject": null,
      "isAmbiguous": true,
      "options": ["AOC", "BPC"],
      "rawText": "AOC / BPC"
    }
  ]
}
`;

  const payload = {
    contents: [
      {
        parts: [
          { text: promptText },
          {
            inlineData: {
              mimeType: mimeType || 'image/jpeg',
              data: base64Data,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
    },
  };

  const candidateModels = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro',
  ];

  let response = null;
  let lastErrText = '';

  for (const modelName of candidateModels) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        response = res;
        break;
      } else {
        lastErrText = await res.text();
        console.warn(`[Gemini API Warning] Model ${modelName} returned status ${res.status}: ${lastErrText}`);
      }
    } catch (fetchErr) {
      console.warn(`[Gemini API Fetch Warning] Model ${modelName} failed: ${fetchErr.message}`);
    }
  }

  if (!response || !response.ok) {
    throw new Error(`Gemini API error: ${lastErrText || 'All Gemini model endpoints failed. Please check API key and models.'}`);
  }

  const resJson = await response.json();
  const textOutput = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textOutput) {
    throw new Error('Gemini API returned an empty response. Unable to scan timetable.');
  }

  // Clean raw markdown if any
  const cleanedText = textOutput.replace(/```json/gi, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(cleanedText);

  // Validate & Normalize parsed output
  const rawSubjects = Array.isArray(parsed.subjects) ? parsed.subjects : [];
  const subjectsSet = new Set(
    rawSubjects
      .map(s => String(s || '').trim().toUpperCase())
      .filter(Boolean)
  );

  const rawSlots = Array.isArray(parsed.timetable) ? parsed.timetable : [];
  const normalizedSlots = [];

  for (const slot of rawSlots) {
    const day = normalizeDay(slot.day);
    if (!day || !VALID_DAYS.includes(day)) continue; // ignore invalid or Sunday days if not in setup days

    const start = normalizeTime(slot.start);
    const duration = Math.max(1, parseInt(slot.duration, 10) || 60);
    const isAmbiguous = Boolean(slot.isAmbiguous || (Array.isArray(slot.options) && slot.options.length > 1));

    let subject = null;
    let options = [];

    if (isAmbiguous) {
      options = (Array.isArray(slot.options) ? slot.options : [])
        .map(o => String(o || '').trim().toUpperCase())
        .filter(Boolean);
      options.forEach(o => subjectsSet.add(o));
    } else if (slot.subject) {
      subject = String(slot.subject).trim().toUpperCase();
      subjectsSet.add(subject);
    }

    normalizedSlots.push({
      id: Math.random().toString(36).slice(2, 11),
      day,
      start,
      duration,
      subject,
      isAmbiguous,
      options,
      rawText: slot.rawText || (isAmbiguous ? options.join(' / ') : subject || ''),
    });
  }

  return {
    subjects: Array.from(subjectsSet),
    timetable: normalizedSlots,
  };
}

// POST /api/timetable/parse
router.post('/parse', async (req, res) => {
  try {
    let base64Data = null;
    let mimeType = null;

    const contentType = req.headers['content-type'] || '';

    if (contentType.includes('multipart/form-data')) {
      const form = new formidable.IncomingForm({ maxFileSize: 25 * 1024 * 1024 });
      const [fields, files] = await new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) reject(err);
          else resolve([fields, files]);
        });
      });

      const fileObj = files.file ? (Array.isArray(files.file) ? files.file[0] : files.file) : null;
      if (!fileObj || !fileObj.filepath) {
        return res.status(400).json({ error: 'No timetable file uploaded.' });
      }

      mimeType = fileObj.mimetype || 'image/jpeg';
      const buffer = fs.readFileSync(fileObj.filepath);
      base64Data = buffer.toString('base64');

      // Cleanup temp file
      try { fs.unlinkSync(fileObj.filepath); } catch (_) {}
    } else if (req.body && req.body.fileData) {
      // Base64 JSON payload
      mimeType = req.body.mimeType || 'image/jpeg';
      let rawBase64 = String(req.body.fileData);
      if (rawBase64.includes(',')) {
        rawBase64 = rawBase64.split(',')[1];
      }
      base64Data = rawBase64;
    } else {
      return res.status(400).json({ error: 'Please upload a file via multipart form-data or JSON base64 fileData.' });
    }

    if (!base64Data) {
      return res.status(400).json({ error: 'File content was empty or unreadable.' });
    }

    const result = await callGeminiVisionAPI(base64Data, mimeType);
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('[Timetable Parse Error]', err);
    return res.status(500).json({
      error: err.message || 'Failed to process timetable. Please try manual entry.',
    });
  }
});

module.exports = router;
