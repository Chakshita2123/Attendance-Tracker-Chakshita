# Implementation Plan: Timetable Upload Modal Fix & UI Polish Pass

## Overview
This plan addresses the **Timetable Upload Modal (AI Scan)** bug where the "Confirm & Apply" button is cut off on mobile devices, ensures full responsiveness at 375px width, and outlines a multi-step process for a cross-platform UI polish pass across Web and Android APK.

---

## User Directives & Process Confirmation

> [!IMPORTANT]
> **Cross-Platform & Build Requirement**:
> All changes will be developed and verified to work identically on both desktop/mobile web browsers and Capacitor's Android WebView.
> Whenever changes are ready for testing on an Android device/emulator:
> 1. Run `npm run build && npx cap sync android`
> 2. Rebuild the Android APK to see changes reflected in the installed native app.

---

## Step 1: Fix Modal Scroll & Confirm Button Visibility

### Root Cause Analysis
In [TimetableUploadModal.jsx](file:///c:/Attendance-tracker-portfolio/Attendance-Tracker/frontend/src/components/setup/TimetableUploadModal.jsx), the action button rows are currently nested **inside** the scrollable `Modal Body` container (`overflowY: 'auto'`).

When Gemini extracts a long schedule (e.g. 6+ subjects and multiple slots):
1. The list content inside `Modal Body` exceeds the modal viewport height (`90vh` / `100dvh`).
2. The `CONFIRM & APPLY TO TIMETABLE` button gets pushed down to the bottom of the scrollable content.
3. On small mobile viewports (375px width, ~667px height), the button is completely hidden below the fold and cut off unless scrolled to the absolute bottom.

### Proposed Code Fix
We restructure [TimetableUploadModal.jsx](file:///c:/Attendance-tracker-portfolio/Attendance-Tracker/frontend/src/components/setup/TimetableUploadModal.jsx) into 3 distinct vertical flex regions:
1. **Modal Header** (`flex-shrink: 0`): Fixed at top.
2. **Modal Body** (`flex: 1`, `overflow-y: auto`, `-webkit-overflow-scrolling: touch`): Scrollable middle section containing error alerts, subject tags, and extracted class slot cards.
3. **Modal Footer** (`flex-shrink: 0`, `background: var(--bg-raised)`, `border-top: 1px solid var(--border)`): Fixed/sticky at bottom, incorporating safe area insets (`padding-bottom: max(14px, env(safe-area-inset-bottom, 14px))`).

#### Fixed Code Structure:
```jsx
<div className="card" style={{ width: '100%', maxWidth: 640, maxHeight: 'calc(100dvh - 32px)', display: 'flex', flexDirection: 'column', ... }}>
  {/* 1. Header (Fixed Top) */}
  <div style={{ padding: '16px 20px', flexShrink: 0, borderBottom: '1px solid var(--border)', background: 'var(--bg-raised)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
    ...
  </div>

  {/* 2. Scrollable Body (Middle only) */}
  <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, WebkitOverflowScrolling: 'touch' }}>
    {error && ( ... )}
    {step === 'upload' && ( <UploadStepContent /> )}
    {step === 'preview' && ( <PreviewStepContent /> )}
  </div>

  {/* 3. Footer (Fixed Bottom - Always visible) */}
  <div style={{ padding: '14px 16px', paddingBottom: 'max(14px, env(safe-area-inset-bottom, 14px))', flexShrink: 0, borderTop: '1px solid var(--border)', background: 'var(--bg-raised)' }}>
    {step === 'upload' ? (
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button className="btn" onClick={resetAndClose} disabled={loading} style={{ minHeight: 44 }}>CANCEL</button>
        <button className="btn btn-primary" disabled={!file || loading} onClick={handleUploadAndScan} style={{ minHeight: 44 }}>
          {loading ? <><RefreshCw className="spin" size={14}/> Scanning...</> : <><Sparkles size={14}/> SCAN TIMETABLE</>}
        </button>
      </div>
    ) : (
      <div className="timetable-modal-footer-actions" style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn btn-ghost" onClick={() => setStep('upload')} style={{ minHeight: 44 }}>
          ← Re-upload
        </button>
        <div style={{ display: 'flex', gap: 8, flex: 1, justifyContent: 'flex-end' }}>
          <button className="btn" onClick={resetAndClose} style={{ minHeight: 44 }}>
            CANCEL
          </button>
          <button className="btn btn-primary" onClick={handleConfirmAndApply} style={{ minHeight: 44, display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={16} /> CONFIRM & APPLY
          </button>
        </div>
      </div>
    )}
  </div>
</div>
```

---

## Step 2: Responsiveness Audit for Upload Timetable Modal (375px)

Audit areas to verify/adjust in Step 2:
1. **Header & Badge wrapping**: Ensure long class names and day/time text wrap cleanly.
2. **Select Dropdowns & Buttons**: Min 44px tap-target height for touch screen usability on mobile WebViews.
3. **No Horizontal Scroll**: Ensure 100% boundary compliance without standard modal horizontal scrollbar.

---

## Step 3: Scope & Plan for General UI Polish Pass

Following user approval of Step 1 & Step 2, a page-by-page proposal will be presented for review covering:
- **Tracker Page**: Card rhythm, attendance percentage indicator badge, active class glow states.
- **Analytics Page**: What-if calculator layout alignment, progress rings, status pill contrast.
- **Edit Setup Page**: Tab navigation spacing, add/delete subject button polish.
- **Auth Page**: Login modal/card alignment, OAuth button loading skeletons.

---

## Verification Plan

### Automated Tests
- Run existing test suites (`npm test` in `frontend/`) to verify no regressions.

### Manual Verification
- Test preview modal with 6+ subjects and ambiguous elective options at 375px mobile screen size.
- Verify modal header and footer remain fixed while body scrolls smoothly.
- Build & sync with Android: `npm run build && npx cap sync android`.
