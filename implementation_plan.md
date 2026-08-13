# Implementation Plan: Mobile Responsiveness, Timetable Time Mapping & Groq Fallback

Addresses the 3 requested tasks: fixing mobile responsiveness regressions across all pages (Tracker, Analytics, Edit Setup), fixing the timetable upload time mapping bug, and adding Groq Vision API as a fallback with client-side token reduction.

---

## Audit Findings for Issue 1 (Mobile Responsiveness at 375px)

Scope analysis of `globals.css` confirmed no broken external imports. However, recent flex/grid additions introduced several mobile (375px width) responsiveness issues:

### 1. Tracker Page (`TrackerPage.jsx`)
- **Stat Cards**: The 3-card stat grid uses `grid-template-columns: 1fr 1fr` on `<480px`, causing 3 cards to wrap into 2 columns on row 1 + 1 column on row 2. Long card labels like `CLASSES (2026-08-13)` clip horizontally.
- **Date Strip & Picker**: The "JUMP TO:" date input box overflows the card padding on 375px screens due to un-wrapped inline flex styles.
- **Toolbar Actions**: `.tracker-toolbar-left` buttons (`ALL PRESENT` & `CLEAR`) share 50% width each on line 1, while `.tracker-toolbar-right` (`UNDO (0)`) stretches 100% full-width on line 2, creating uneven button heights and alignment.
- **Subject Cards**: Long subject names (e.g. `DATA STRUCTURES AND ALGORITHMS`) lack truncation (`text-overflow: ellipsis`), pushing the `P / A / L` button row (min 160px) off the right side of the screen, causing horizontal body scroll.
- **Breakdown Pie Card**: `flex-between` on the bottom card lacks `flex-wrap: wrap`, forcing the breakdown list and 140px `PieChart` side-by-side on 343px width, clipping off-screen.

### 2. Analytics Page (`AnalyticsPage.jsx`)
- **Stat Cards**: Same unbalanced 2+1 grid wrapping issue.
- **What-If Calculator Card**: Card title (`WHAT-IF PREDICTION CALCULATOR`) + `INTERACTIVE TOOL` badge collide and wrap awkwardly. The "Comparison Strip" (`Current % → Projected % + Delta Pill + Status Badge`) overflows horizontally without line-wrapping.
- **Subject Breakdown List**: Status banners inside subject cards wrap tightly or clip on 375px width.

### 3. Edit Setup Page (`SetupPage.jsx`)
- **Card Header Action Collisions**: Section headers (`Step 1 Subjects`, `Step 4 Weekly Timetable`, and `TermManager`) place text and action buttons (`UPLOAD TIMETABLE (AI SCAN)`) side-by-side without flex-wrap, causing buttons to clip off-screen at 375px.
- **Step 2 Starting Balance Grid**: `DL (Duty Leave)` and `ML (Medical Leave)` labels wrap awkwardly on 2-column mobile viewports.
- **Step 3 Class Settings**: "Default Lecture Duration" and "Target Attendance Threshold" flex rows collide with input controls without proper wrapping.
- **Step 4 Timetable Cards**: Class slots lack text truncation on subject names.

---

## User Directives & Process Confirmation

> [!IMPORTANT]
> **Android APK Build Reminder**:
> Mobile UI responsiveness fixes apply to both web and native Capacitor WebView.
> Once UI changes are verified on web, run:
> `npm run build && npx cap sync android`
> in `frontend/` to resync and rebuild the Android APK.

---

## Proposed Changes

### [Component 1] Mobile CSS & Page Responsiveness (Issue 1)

#### [MODIFY] [globals.css](file:///c:/Attendance-tracker-portfolio/Attendance-Tracker/frontend/src/styles/globals.css)
- Update `.stat-grid` mobile breakpoint (`<480px`) to use `grid-template-columns: repeat(3, 1fr)` with smaller font sizes for labels (`9px`) or stack as single-column clean cards.
- Add text truncation utilities and max-width constraints for `.subject-name` in `.subject-row`.
- Update `.tracker-toolbar` styles so button rows align symmetrically on small viewports.
- Add responsive wrapping rules for headers containing action buttons (`.setup-step-label`, `TermManager`, `.card-title`).

#### [MODIFY] [TrackerPage.jsx](file:///c:/Attendance-tracker-portfolio/Attendance-Tracker/frontend/src/pages/TrackerPage.jsx)
- Wrap date picker container cleanly below date pills.
- Apply text truncation to class subject titles.
- Add `flex-wrap: wrap` to the bottom breakdown pie chart card.

#### [MODIFY] [WhatIfCalculator.jsx](file:///c:/Attendance-tracker-portfolio/Attendance-Tracker/frontend/src/components/analytics/WhatIfCalculator.jsx)
- Allow header title and status badge to wrap cleanly on 375px.
- Make comparison output strip responsive with wrapping on small screens.

#### [MODIFY] [SetupPage.jsx](file:///c:/Attendance-tracker-portfolio/Attendance-Tracker/frontend/src/pages/SetupPage.jsx)
- Add header wrapping for AI Scan action buttons.
- Adjust starting balance label styling for 375px screens.

---

### [Component 2] Timetable Time Extraction Fix (Issue 2)

#### [MODIFY] [backend/routes/timetable.js](file:///c:/Attendance-tracker-portfolio/Attendance-Tracker/backend/routes/timetable.js)
- Update `normalizeTime()` to check multiple key names (`slot.start`, `slot.startTime`, `slot.time`, `slot.start_time`, `slot.from`).
- Expand time regex to handle 12-hour/24-hour formats without requiring explicit 2-digit minutes or strict colons (e.g. `"9"`, `"9 AM"`, `"9.00"`, `"09:00 - 10:00"`).

#### [MODIFY] [TimetableUploadModal.jsx](file:///c:/Attendance-tracker-portfolio/Attendance-Tracker/frontend/src/components/setup/TimetableUploadModal.jsx)
- Ensure extracted `slot.start` is strictly normalized to `"HH:MM"` format before rendering in preview and saving to `data.timetable`.

---

### [Component 3] Groq Vision Fallback & Token Optimization (Issue 3)

#### [MODIFY] [TimetableUploadModal.jsx](file:///c:/Attendance-tracker-portfolio/Attendance-Tracker/frontend/src/components/setup/TimetableUploadModal.jsx)
- Implement client-side image compression using offscreen Canvas to scale images to max 1024px dimension and encode as JPEG (quality ~0.82) before sending base64 data URL to backend.

#### [MODIFY] [backend/routes/timetable.js](file:///c:/Attendance-tracker-portfolio/Attendance-Tracker/backend/routes/timetable.js)
- Streamline OCR extraction prompt to be concise while enforcing strict JSON output.
- Add `callGroqVisionAPI(base64Data, mimeType)` for Groq Vision API completions.
- Implement `fetchLiveGroqVisionModels(apiKey)` via `GET https://api.groq.com/openai/v1/models` to discover active vision models (`llama-3.2-11b-vision-preview`, `llama-3.2-90b-vision-preview`, etc.).
- Update `/api/timetable/parse` route to attempt Gemini Vision API first; if Gemini fails or hits a rate limit (429/quota error), automatically fallback to Groq Vision API seamlessly.

#### [MODIFY] [backend/.env](file:///c:/Attendance-tracker-portfolio/Attendance-Tracker/backend/.env)
- Format

#### [MODIFY] [backend/.env.example](file:///c:/Attendance-tracker-portfolio/Attendance-Tracker/backend/.env.example)
- Add `GROQ_API_KEY=your_groq_api_key_here`.

---

## Verification Plan

### Automated Tests
- Run existing backend tests (`npm test` in `backend/`) to verify timetable parse route logic.

### Manual Verification
- Test Tracker, Analytics, and Edit Setup pages at 375px mobile viewport in browser.
- Upload timetable image, verify extracted time (`start`) maps accurately to saved timetable classes.
- Verify client-side image compression reduces upload payload size.
- Test Groq fallback by simulating Gemini failure / 429 response.
- Android APK build verification: `npm run build && npx cap sync android` in `frontend/`.
