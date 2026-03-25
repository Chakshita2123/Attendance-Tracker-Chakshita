# Production Deployment Plan (Render & Vercel)

The goal is to prepare both the frontend and backend for deployment. The frontend is already well-structured to use `import.meta.env.VITE_API_BASE_URL` for API calls, which is perfect for Vercel.

## Proposed Changes

### Backend (Render)

1.  **[MODIFY]** `backend/package.json`
    *   Add a `"start": "node server.js"` script. Render requires this standard script to know how to start your production server (it shouldn't use `nodemon` in production).
2.  **[MODIFY]** `backend/server.js`
    *   Update the `cors()` middleware to securely accept requests from your Vercel frontend URL, instead of allowing all origins. We will make it use an environment variable `FRONTEND_URL`.

### Frontend (Vercel)

1.  **[NEW]** `frontend/vercel.json`
    *   Create a configuration file to tell Vercel to redirect all traffic to `index.html`. Because React handles routing on the client side, Vercel needs this so users can refresh pages without getting a 404 error.

---

## Verification Plan

### Manual Verification
Once these changes are applied, you will need to:

1.  **Deploy the Backend to Render:**
    *   Connect your GitHub repo to Render and create a new "Web Service".
    *   Set the Build Command to: `npm install`
    *   Set the Start Command to: `npm start`
    *   Add your environment variables (`DATABASE_URL`, `JWT_SECRET`, etc.).
    *   *Note down the deployed Render URL (e.g., https://your-backend.onrender.com).*

2.  **Deploy the Frontend to Vercel:**
    *   Connect your GitHub repo to Vercel.
    *   When importing the project, set the Root Directory to `frontend`.
    *   In the Environment Variables section, add `VITE_API_BASE_URL` and set it to your Render URL (from step 1).
    *   *Note down the deployed Vercel URL.*

3.  **Link them together:**
    *   Go back to Render, and add a new environment variable `FRONTEND_URL` set to your Vercel URL.
    *   Test the live application out!
