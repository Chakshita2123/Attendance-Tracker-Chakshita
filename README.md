# MARKD — Attendance Tracker

Mark, track and analyse your class attendance.

## Stack

- **Frontend**: React 19 + Vite, Recharts (charts), Lucide React (icons)
- **Backend**: Node.js + Express 5, Mongoose ODM, MongoDB Atlas
- **Auth**: Stateless JWT auth — `scrypt` password hashing, JWT tokens stored in `localStorage`
- **Deployment**: Single Render Web Service (Express serves the built Vite app statically)

---

## Quick Start

```bash
# 1. Install all dependencies (root + backend + frontend)
npm run install:all

# 2. Set up environment variables (see below)

# 3. Run both dev servers concurrently
npm run dev
```

The `dev` command starts:
- **Backend** on `http://localhost:5000` (nodemon, auto-reloads)
- **Frontend** on `http://localhost:5173` (Vite HMR)

---

## Environment Variables

Create **`backend/.env`** with:

```bash
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/attendance-tracker?retryWrites=true&w=majority
JWT_SECRET=your_random_secret_here
PORT=5000
```

Generate a strong `JWT_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> No root-level `.env` or frontend `.env` is needed for local development.
> `VITE_API_BASE_URL` defaults to `http://localhost:5000` in dev and to same-origin (`''`) in production builds automatically.

---

## Scripts

| Script | What it does |
|--------|--------------|
| `npm run install:all` | Installs root, backend, and frontend dependencies |
| `npm run dev` | Runs backend + frontend dev servers concurrently |
| `npm run build` | Builds the Vite frontend bundle into `frontend/dist/`, then installs backend deps |
| `npm start` | Starts the Express server — serves the API and the built frontend from the same origin |

---

## Production Build

```bash
npm run build    # builds frontend/dist
npm start        # serves everything on PORT (default 5000)
```

In production the Express server:
1. Serves `frontend/dist/` as static files
2. Handles all `/api/*` routes normally
3. Falls back to `frontend/dist/index.html` for any non-API GET request (enables client-side routing on page refresh)

---

## MongoDB / Database Notes

- Mongoose models live in `backend/models/` (User, Class, Attendance, UserData)
- `backend/.env` must contain `MONGODB_URI` — the MongoDB Atlas connection string
- Mongoose creates collections automatically on first write — no migrations needed
- The `UserData` model stores the config blob (timetable, phase, etc.) with an integer `version` field for optimistic concurrency

---

## Deploy to Render

See [RENDER_DEPLOY_GUIDE.md](./RENDER_DEPLOY_GUIDE.md) for the one-service Render setup.
