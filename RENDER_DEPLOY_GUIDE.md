# Render Deployment Guide — Attendance Tracker

## Root Cause Summary

Three code-level bugs + one Render configuration mistake cause the build to fail.

---

## Bug Fixes Applied (Already Done)

### Fix 1 — `backend/prisma/schema.prisma`: Missing `DATABASE_URL`

The datasource block had no `url` field, so Prisma couldn't connect to the database or generate a client.

```diff
 datasource db {
   provider = "postgresql"
+  url      = env("DATABASE_URL")
 }
```

### Fix 2 — `backend/package.json`: Add `postinstall` + move `nodemon`

Render runs `npm install` then starts your app. Without `postinstall`, the Prisma client in `generated/prisma/` is never built (it's gitignored), so any import of `@prisma/client` crashes at runtime.

```diff
 "scripts": {
   "start": "node server.js",
   "dev": "nodemon server.js",
   "test": "jest",
-  "test:watch": "jest --watch"
+  "test:watch": "jest --watch",
+  "postinstall": "prisma generate"
 },
 "dependencies": {
   "@prisma/adapter-pg": "^7.5.0",
   "@prisma/client": "^7.5.0",
   "cors": "^2.8.6",
   "dotenv": "^17.3.1",
   "express": "^5.2.1",
-  "nodemon": "^3.1.14",
   "pg": "^8.20.0"
 },
 "devDependencies": {
   "jest": "^30.3.0",
+  "nodemon": "^3.1.14",
   "prisma": "^7.5.0",
   "supertest": "^7.2.2"
 }
```

---

## Render Service Setup

You need **two services** — one Web Service (backend) and one Static Site (frontend).

---

### Service 1 — Backend (Web Service)

In the Render dashboard → **New → Web Service** → connect to your repo.

| Field | Value |
|-------|-------|
| **Root Directory** | `backend` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Environment** | `Node` |

#### Environment Variables (set in Render dashboard — NOT in `.env`)

| Key | Value |
|-----|-------|
| `DATABASE_URL` | `postgresql://neondb_owner:<password>@<your-neon-host>/neondb?sslmode=require&channel_binding=require` |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | `https://<your-frontend-service>.onrender.com` |

> ⚠️ **Do not commit `DATABASE_URL` to git.** Your `.env` already has a real password in it. Set it only in the Render dashboard.

> ℹ️ The `postinstall` script runs `prisma generate` automatically after `npm install`, rebuilding the Prisma client even though `generated/prisma` is gitignored.

---

### Service 2 — Frontend (Static Site)

In the Render dashboard → **New → Static Site** → connect to your repo.

| Field | Value |
|-------|-------|
| **Root Directory** | `frontend` |
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `dist` |

#### Environment Variables (set in Render dashboard)

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://<your-backend-service>.onrender.com/api` |
| `VITE_APP_ENV` | `production` |

> ⚠️ Your current `frontend/.env` has `VITE_API_URL=http://localhost:5000/api`. Vite bakes env vars into the bundle at build time — this WILL make all API calls fail in production. You must set the correct URL in the Render dashboard env vars panel so it overrides the committed `.env`.

---

## Pre-Deploy Checklist

- [ ] `schema.prisma` has `url = env("DATABASE_URL")` ✅ fixed
- [ ] `backend/package.json` has `"postinstall": "prisma generate"` ✅ fixed
- [ ] Backend Render service has `DATABASE_URL`, `NODE_ENV`, `FRONTEND_URL` set
- [ ] Frontend Render static site has `VITE_API_URL` pointing to the backend Render URL
- [ ] All changes are pushed to the git branch connected to Render
- [ ] Trigger a manual redeploy on both services

---

## Gotcha Reference Table

| Symptom | Root Cause | Fix |
|---------|-----------|-----|
| `Cannot find module '../generated/prisma'` | Prisma client not generated on server | `"postinstall": "prisma generate"` ✅ |
| `Environment variable not found: DATABASE_URL` | Not set in Render dashboard | Add under **Environment → Env Vars** |
| API calls fail / `ERR_CONNECTION_REFUSED` | `VITE_API_URL` still points to localhost | Set correct backend URL in Render dashboard |
| CORS error in browser | `FRONTEND_URL` env var missing on backend | Set `FRONTEND_URL` on backend Render service |
| App crashes on start (build OK) | Wrong start command or `NODE_ENV` missing | Verify start command is `npm start` |
| `Error: P1001` (Prisma can't reach DB) | `DATABASE_URL` wrong or missing | Double-check value in Render dashboard |
