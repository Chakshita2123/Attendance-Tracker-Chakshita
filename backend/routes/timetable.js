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

/**
 * Enhanced time normalizer handling 12-hour/24-hour formats, range strings, and missing minutes.
 * E.g. "9", "9 AM", "09:00", "9.00", "9:00 AM - 10:00 AM", "14:30" -> "09:00" / "14:30".
 */
function normalizeTime(val) {
  if (!val) return '09:00';
  const clean = String(val).trim();

  // If time range like "09:00 - 10:00" or "9am to 10am", extract start portion
  const startPart = clean.split(/[-–—]| to /i)[0].trim();

  // Match 1: HH:MM or H:MM with optional AM/PM (e.g., "9:00", "09.30", "2:15 pm", "14:00")
  const matchWithMins = startPart.match(/(\d{1,2})[:.](\d{2})\s*(am|pm)?/i);
  if (matchWithMins) {
    let hrs = parseInt(matchWithMins[1], 10);
    const mins = matchWithMins[2];
    const ampm = matchWithMins[3] ? matchWithMins[3].toLowerCase() : null;

    if (ampm === 'pm' && hrs < 12) hrs += 12;
    if (ampm === 'am' && hrs === 12) hrs = 0;
    hrs = Math.min(23, Math.max(0, hrs));

    return `${String(hrs).padStart(2, '0')}:${mins}`;
  }

  // Match 2: H or HH with AM/PM (e.g., "9 AM", "2pm", "10am")
  const matchHoursOnly = startPart.match(/(\d{1,2})\s*(am|pm)/i);
  if (matchHoursOnly) {
    let hrs = parseInt(matchHoursOnly[1], 10);
    const ampm = matchHoursOnly[2].toLowerCase();

    if (ampm === 'pm' && hrs < 12) hrs += 12;
    if (ampm === 'am' && hrs === 12) hrs = 0;
    hrs = Math.min(23, Math.max(0, hrs));

    return `${String(hrs).padStart(2, '0')}:00`;
  }

  // Match 3: Standalone 1 or 2 digits (e.g. "9", "14")
  const matchDigits = startPart.match(/^(\d{1,2})$/);
  if (matchDigits) {
    let hrs = parseInt(matchDigits[1], 10);
    if (hrs >= 1 && hrs <= 23) {
      return `${String(hrs).padStart(2, '0')}:00`;
    }
  }

  return '09:00';
}

const CONCISE_PROMPT = `
You are an expert academic timetable OCR parser. Extract all subject names and scheduled class slots from this timetable file.

Return ONLY a valid JSON object matching this exact schema:
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

Rules:
- "day": Must be one of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].
- "start": Start time in 24h format (e.g. "09:00").
- "duration": Lecture duration in minutes (integer, default 60).
- "isAmbiguous": true if slot has multiple subject choices (e.g. "AOC / BPC"), otherwise false.
- Output raw valid JSON only (no markdown fences, no extra text).
`;

/**
 * Normalizes raw model JSON string output into standard application format.
 */
function parseAndNormalizeOutput(textOutput) {
  if (!textOutput) throw new Error('Model returned an empty response.');

  const cleanedText = textOutput.replace(/```json/gi, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(cleanedText);

  const rawSubjects = Array.isArray(parsed.subjects) ? parsed.subjects : [];
  const subjectsSet = new Set(
    rawSubjects
      .map(s => String(s || '').trim().toUpperCase())
      .filter(Boolean)
  );

  const rawSlots = Array.isArray(parsed.timetable) ? parsed.timetable : [];
  const normalizedSlots = [];

  for (const slot of rawSlots) {
    const day = normalizeDay(slot.day || slot.weekday || slot.dayOfWeek);
    if (!day || !VALID_DAYS.includes(day)) continue;

    const rawStart = slot.start || slot.startTime || slot.time || slot.start_time || slot.from || slot.rawTime;
    const start = normalizeTime(rawStart);
    const duration = Math.max(1, parseInt(slot.duration || slot.durationMinutes || slot.length, 10) || 60);
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

/**
 * Fetches the list of live models from Gemini API that support generateContent.
 */
async function fetchLiveGeminiModels(apiKey) {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data?.models)) return [];

    const validModels = data.models
      .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
      .map(m => m.name.replace(/^models\//, ''))
      .filter(Boolean);

    const flashModels = validModels.filter(m => m.toLowerCase().includes('flash'));
    const nonFlashModels = validModels.filter(m => !m.toLowerCase().includes('flash'));

    return [...flashModels, ...nonFlashModels];
  } catch (err) {
    console.warn('[Gemini ListModels Discovery Warning]', err.message);
    return [];
  }
}

/**
 * Call Gemini Vision API to analyze image/PDF buffer and return parsed schedule JSON
 */
async function callGeminiVisionAPI(base64Data, mimeType) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the backend environment.');
  }

  const payload = {
    contents: [
      {
        parts: [
          { text: CONCISE_PROMPT },
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

  const candidateModels = [];

  if (process.env.GEMINI_MODEL_NAME && process.env.GEMINI_MODEL_NAME.trim()) {
    candidateModels.push(process.env.GEMINI_MODEL_NAME.trim());
  }

  const liveModels = await fetchLiveGeminiModels(apiKey);
  liveModels.forEach(m => {
    if (!candidateModels.includes(m)) candidateModels.push(m);
  });

  const fallbackDefaults = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash', 'gemini-flash', 'gemini-pro'];
  fallbackDefaults.forEach(m => {
    if (!candidateModels.includes(m)) candidateModels.push(m);
  });

  let response = null;
  let lastErrText = '';
  let successfulModel = '';

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
        successfulModel = modelName;
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
    throw new Error(`Gemini API error: ${lastErrText || 'All Gemini model endpoints failed.'}`);
  }

  console.log(`[Gemini API Success] Successfully parsed using model: "${successfulModel}"`);

  const resJson = await response.json();
  const textOutput = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;
  return parseAndNormalizeOutput(textOutput);
}

/**
 * Fetches live Groq models and filters vision-capable models.
 */
async function fetchLiveGroqVisionModels(apiKey) {
  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data?.data)) return [];

    const visionModels = data.data
      .map(m => m.id)
      .filter(id => id && (id.includes('vision') || id.includes('llama-3.2')));

    return visionModels;
  } catch (err) {
    console.warn('[Groq ListModels Discovery Warning]', err.message);
    return [];
  }
}

/**
 * Call Groq Vision API as a fallback when Gemini API calls fail or hit rate limits
 */
async function callGroqVisionAPI(base64Data, mimeType) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured on the backend environment.');
  }

  const liveGroqModels = await fetchLiveGroqVisionModels(apiKey);
  const fallbackGroqModels = [
    'llama-3.2-11b-vision-preview',
    'llama-3.2-90b-vision-preview',
    'llama-3.2-11b-vision-instruct',
    'llama-3.2-90b-vision-instruct',
  ];

  const candidateModels = Array.from(new Set([...liveGroqModels, ...fallbackGroqModels])).filter(Boolean);

  let response = null;
  let lastErrText = '';
  let successfulModel = '';

  const imageUrl = `data:${mimeType || 'image/jpeg'};base64,${base64Data}`;

  for (const modelName of candidateModels) {
    const payload = {
      model: modelName,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: CONCISE_PROMPT },
            {
              type: 'image_url',
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    };

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        response = res;
        successfulModel = modelName;
        break;
      } else {
        lastErrText = await res.text();
        console.warn(`[Groq API Warning] Model ${modelName} returned status ${res.status}: ${lastErrText}`);
      }
    } catch (fetchErr) {
      console.warn(`[Groq API Fetch Warning] Model ${modelName} failed: ${fetchErr.message}`);
    }
  }

  if (!response || !response.ok) {
    throw new Error(`Groq API error: ${lastErrText || 'All Groq vision models failed.'}`);
  }

  console.log(`[Groq API Success] Successfully parsed using model: "${successfulModel}"`);

  const resJson = await response.json();
  const textOutput = resJson?.choices?.[0]?.message?.content;
  return parseAndNormalizeOutput(textOutput);
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

      try { fs.unlinkSync(fileObj.filepath); } catch (_) {}
    } else if (req.body && req.body.fileData) {
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

    // Try primary provider (Gemini Vision API) first
    try {
      const geminiResult = await callGeminiVisionAPI(base64Data, mimeType);
      return res.json({ success: true, data: geminiResult, provider: 'gemini' });
    } catch (geminiErr) {
      console.warn('[Gemini Vision Failed — Attempting Groq Fallback]', geminiErr.message);

      // Attempt fallback provider (Groq Vision API)
      if (process.env.GROQ_API_KEY) {
        try {
          const groqResult = await callGroqVisionAPI(base64Data, mimeType);
          return res.json({ success: true, data: groqResult, provider: 'groq' });
        } catch (groqErr) {
          console.error('[Groq Fallback Also Failed]', groqErr.message);
          throw new Error(`Primary and Fallback AI scan failed. Gemini: ${geminiErr.message} | Groq: ${groqErr.message}`);
        }
      } else {
        throw geminiErr;
      }
    }
  } catch (err) {
    console.error('[Timetable Parse Error]', err);
    return res.status(500).json({
      error: err.message || 'Failed to process timetable. Please try manual entry.',
    });
  }
});

module.exports = router;
