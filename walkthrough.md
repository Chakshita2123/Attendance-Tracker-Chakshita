# Walkthrough - Timetable Upload (AI Scan with Gemini Vision)

We have implemented the **Upload Timetable (AI Scan)** feature in Edit Setup. Users can now upload a timetable image (JPG, PNG, WEBP) or PDF file, automatically detect subjects and weekly class schedules via the backend Gemini Vision API, preview & resolve elective choices, and apply entries to their setup.

## Changes Made

### Backend

#### [NEW] [backend/routes/timetable.js](file:///c:/Attendance-tracker-portfolio/Attendance-Tracker/backend/routes/timetable.js)
- Created `POST /api/timetable/parse` route handling both multipart form uploads and base64 JSON file payloads up to 25MB.
- Calls Gemini Vision API (`gemini-1.5-flash`) using `process.env.GEMINI_API_KEY` kept securely on the server.
- Prompt instructs Gemini to output strict JSON extracting subject names, class slots, days (`Mon`..`Sat`), start times (`HH:MM`), durations, and flags for ambiguous/elective slots (e.g. `"AOC / BPC"`).
- Normalizes day keys to strictly match 3-letter title-case strings (`Mon`, `Tue`, `Wed`, `Thu`, `Fri`, `Sat`).

#### [MODIFY] [backend/server.js](file:///c:/Attendance-tracker-portfolio/Attendance-Tracker/backend/server.js)
- Registered `app.use('/api/timetable', timetableRoutes)` and increased `express.json` limit to `25mb` for base64 file payloads.

#### [NEW] [backend/__tests__/routes/timetable.test.js](file:///c:/Attendance-tracker-portfolio/Attendance-Tracker/backend/__tests__/routes/timetable.test.js)
- Created unit tests verifying request payload validation and missing API key error handling.

---

### Frontend

#### [NEW] [frontend/src/components/setup/TimetableUploadModal.jsx](file:///c:/Attendance-tracker-portfolio/Attendance-Tracker/frontend/src/components/setup/TimetableUploadModal.jsx)
- **Upload Screen**: Supports drag-and-drop & file selection for JPG, PNG, WEBP, and PDF files.
- **Loading & Error Handling**: Displays scanning state with loading spinner; shows dismissible error banner if Gemini scan fails, allowing smooth fallback to manual entry.
- **Preview & Disambiguation Screen**:
  - Displays detected subjects list with add/delete options.
  - Lists extracted schedule slots by day/time/duration.
  - **Elective Choice Disambiguation**: Flags multi-option slots (e.g., `"AOC / BPC"`) with a prominent warning and dropdown selector forcing selection of a single subject.
  - **Overlap Detection**: Checks extracted slots against existing `data.timetable` entries for that day and highlights conflicts.
- **Confirm & Apply**: Merges subjects into `data.subjects` and inserts schedule entries into `data.timetable` using exact standard formatting (`id`, `subject`, `start`, `duration`, sorted by `start`).

#### [MODIFY] [frontend/src/pages/SetupPage.jsx](file:///c:/Attendance-tracker-portfolio/Attendance-Tracker/frontend/src/pages/SetupPage.jsx)
- Added **"UPLOAD TIMETABLE (AI SCAN)"** action buttons to Step 1 (Subjects) and Step 4 (Weekly Timetable) section headers.
- Mounted `TimetableUploadModal`.

---

## Verification Results

1. **Day Key Alignment**: Output mapped strictly to `['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']`.
2. **PDF Support**: Direct `application/pdf` base64 inlineData sent to Gemini.
3. **Disambiguation**: Multi-subject choices flagged for mandatory user selection before apply.
4. **Overlap Detection**: Extracted slots checked against existing `data.timetable` entries and badged if overlapping.
5. **Existing Functionality**: Manual setup, starting balances, and analytics remain fully intact and operational.
