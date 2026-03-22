# MARKD — Attendance Tracker

Mark, track and analyse your class attendance.

## Setup

```bash
npm install
npm run dev
```

## Google OAuth — Fix Redirect (IMPORTANT)

If Google login redirects to the wrong URL, add your local dev URL
to Supabase's allowed redirect list:

1. Go to your Supabase project → **Authentication → URL Configuration**
2. Under **Redirect URLs**, add:
   - `http://localhost:5173`
   - `http://localhost:5174` (in case port shifts)
   - Your production URL (e.g. `https://yourapp.vercel.app`)
3. Click **Save**

The code sends `redirectTo: window.location.origin` so it redirects back
to whatever environment the app is running in.

## Stack

- React 19 + Vite
- Supabase (Auth + Postgres)
- Recharts (charts)
- Lucide React (icons)
