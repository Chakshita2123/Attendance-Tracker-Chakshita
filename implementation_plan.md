# Implementation Plan — Google OAuth Authentication Migration

This plan details replacing the existing email/password + Brevo password-reset authentication system with Google OAuth 2.0 (Google Identity Services) as the single, primary login method for MARKD.

## Account Linking Strategy for Existing Users

> [!IMPORTANT]
> **How Existing Users are Handled:**
> When a user logs in via Google OAuth:
> 1. Look up existing user by `googleId`.
> 2. If not found, look up existing user by `email` (matching the Google account email).
> 3. If found by `email`, **link the account automatically** by attaching `googleId`, `name`, and `picture` to that existing User document in MongoDB. This ensures existing users lose zero data (their classes, timetable, attendance history remain linked).
> 4. If neither matches, create a new User document with `googleId`, `email`, `name`, and `picture`.

---

## File Summary: Files to Delete & Modify

### Files to DELETE (5 files):
- [DELETE] [backend/email.js](file:///c:/Attendance-tracker-portfolio/Attendance-Tracker/backend/email.js)
- [DELETE] [backend/__tests__/routes/auth.passwordreset.test.js](file:///c:/Attendance-tracker-portfolio/Attendance-Tracker/backend/__tests__/routes/auth.passwordreset.test.js)
- [DELETE] [backend/__tests__/routes/auth.ratelimit.test.js](file:///c:/Attendance-tracker-portfolio/Attendance-Tracker/backend/__tests__/routes/auth.ratelimit.test.js)
- [DELETE] [frontend/src/pages/ForgotPasswordPage.jsx](file:///c:/Attendance-tracker-portfolio/Attendance-Tracker/frontend/src/pages/ForgotPasswordPage.jsx)
- [DELETE] [frontend/src/pages/ResetPasswordPage.jsx](file:///c:/Attendance-tracker-portfolio/Attendance-Tracker/frontend/src/pages/ResetPasswordPage.jsx)

### Files to MODIFY (11 files):
- [MODIFY] [backend/package.json](file:///c:/Attendance-tracker-portfolio/Attendance-Tracker/backend/package.json) — Add `google-auth-library`.
- [MODIFY] [backend/models/User.js](file:///c:/Attendance-tracker-portfolio/Attendance-Tracker/backend/models/User.js) — Update schema for Google OAuth fields.
- [MODIFY] [backend/auth.js](file:///c:/Attendance-tracker-portfolio/Attendance-Tracker/backend/auth.js) — Remove scrypt password hashing functions.
- [MODIFY] [backend/routes/auth.js](file:///c:/Attendance-tracker-portfolio/Attendance-Tracker/backend/routes/auth.js) — Replace email/password routes with `POST /api/auth/google`.
- [MODIFY] [backend/.env.example](file:///c:/Attendance-tracker-portfolio/Attendance-Tracker/backend/.env.example) — Add `GOOGLE_CLIENT_ID`. Remove Brevo keys.
- [MODIFY] [backend/__tests__/routes/auth.test.js](file:///c:/Attendance-tracker-portfolio/Attendance-Tracker/backend/__tests__/routes/auth.test.js) — Update tests for `POST /api/auth/google`.
- [MODIFY] [frontend/index.html](file:///c:/Attendance-tracker-portfolio/Attendance-Tracker/frontend/index.html) — Add Google Identity Services script.
- [MODIFY] [frontend/.env](file:///c:/Attendance-tracker-portfolio/Attendance-Tracker/frontend/.env) — Add `VITE_GOOGLE_CLIENT_ID`.
- [MODIFY] [frontend/src/hooks/useAuth.js](file:///c:/Attendance-tracker-portfolio/Attendance-Tracker/frontend/src/hooks/useAuth.js) — Update hook to export `signInWithGoogle`.
- [MODIFY] [frontend/src/pages/AuthPage.jsx](file:///c:/Attendance-tracker-portfolio/Attendance-Tracker/frontend/src/pages/AuthPage.jsx) — Replace email/password form with Google Sign-In button.
- [MODIFY] [frontend/src/App.jsx](file:///c:/Attendance-tracker-portfolio/Attendance-Tracker/frontend/src/App.jsx) — Remove legacy resetToken URL handling.

---

## Detailed Step-by-Step Plan

### Phase 1: Backend Updates
1. Install `google-auth-library` in `backend/`.
2. Update `User.js` model schema:
   - Remove: `passwordHash`, `passwordResetToken`, `passwordResetExpiry`.
   - Add: `googleId` (String, unique, sparse), `name` (String), `picture` (String).
3. Clean up `backend/auth.js`:
   - Remove `hashPassword` and `verifyPassword`.
   - Retain `createToken`, `readBearerToken`, `requireAuth`, `normalizeEmail`.
4. Update `backend/routes/auth.js`:
   - Remove `signup`, `signin`, `forgot-password`, `reset-password` routes and rate limiters.
   - Delete `backend/email.js`.
   - Implement `POST /api/auth/google` route:
     - Receives Google ID token `credential` from client.
     - Verifies with `OAuth2Client.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID })`.
     - Finds user by `googleId` or `email`, or creates new user record.
     - Issues JWT token (`createToken`) matching existing session format.
5. Update `backend/.env.example` with `GOOGLE_CLIENT_ID`.
6. Refactor unit tests in `backend/__tests__/routes/auth.test.js` and delete obsolete test files (`auth.passwordreset.test.js`, `auth.ratelimit.test.js`).

### Phase 2: Frontend Updates
1. Include Google Identity Services script in `frontend/index.html`.
2. Update `useAuth.js`:
   - Replace `signIn` and `signUp` functions with `signInWithGoogle(credential)`.
   - Post Google credential token to `POST /api/auth/google`.
   - Preserve existing `markd_auth_token` in `localStorage` & session loading logic.
3. Update `AuthPage.jsx`:
   - Remove email/password inputs, login/signup toggle, and forgot password link.
   - Render official Google Sign-In button (`google.accounts.id.renderButton`).
4. Update `App.jsx`:
   - Delete `getResetToken()` URL checker and remove `reset-password` & `forgot-password` pre-auth views.
   - Delete `ForgotPasswordPage.jsx` & `ResetPasswordPage.jsx`.

---

## Verification Plan

### Automated Tests
- Run `npm test` in `backend/` to verify all backend unit tests pass.

### Manual Testing & Setup
- Configure `GOOGLE_CLIENT_ID` in Google Cloud Console.
- Test Google Sign-In button click, popup, backend token verification, user creation, and JWT issue.
