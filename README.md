# MARKD — Attendance Tracker

Mark, track and analyse your class attendance.

## Setup

```bash
npm install
npm run dev
```

## Neon / Stack Auth Env

Create a root `.env` for the Vite app:

```bash
VITE_STACK_PROJECT_ID=your_stack_project_id
VITE_STACK_PUBLISHABLE_CLIENT_KEY=your_stack_publishable_client_key
VITE_API_BASE_URL=http://localhost:5000
```

Update `backend/.env` for the Express API:

```bash
DATABASE_URL=your_neon_postgres_connection_string
STACK_PROJECT_ID=your_stack_project_id
STACK_SECRET_SERVER_KEY=your_stack_secret_server_key
STACK_API_URL=https://api.stack-auth.com
PORT=5000
```

Notes:
- `VITE_STACK_PROJECT_ID` must be the real project ID, not a URL
- `VITE_STACK_PUBLISHABLE_CLIENT_KEY` is required for email/password and Google login
- `STACK_SECRET_SERVER_KEY` is required so the backend can verify `x-stack-access-token`
- `VITE_API_BASE_URL` should point at this Express backend in local development

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
