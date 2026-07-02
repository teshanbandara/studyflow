# StudyFlow — Student Dashboard

A React + TypeScript + Tailwind student productivity dashboard (tasks, habits, pomodoro timer, exams, notes, goals, achievements, daily reflection). Data is stored in the browser's localStorage — no backend needed.

## Run locally in VS Code

1. Open this folder in VS Code.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Open the printed URL (usually http://localhost:5173).

## Build for production

```bash
npm run build
npm run preview   # optional local check of the production build
```

## Deploy to Vercel

**Option A — Vercel CLI**
```bash
npm i -g vercel
vercel
```
Follow the prompts (framework will auto-detect as Vite).

**Option B — GitHub + Vercel dashboard**
1. Push this folder to a new GitHub repo.
2. Go to https://vercel.com/new and import the repo.
3. Vercel auto-detects the Vite framework preset:
   - Build command: `npm run build`
   - Output directory: `dist`
4. Click Deploy.

`vercel.json` is already included so client-side routing (if you add any later) won't 404 on refresh.

## Online Leaderboard setup (Vercel KV)

The Leaderboard tab is backed by a small serverless API (`api/leaderboard.ts`) that stores scores in **Vercel KV** (a free Redis database) so everyone who opens the app sees the same shared rankings. It's **weekly**: each ISO week (Monday–Sunday) gets its own ranking, and it resets automatically once a new week starts — no manual reset needed.

**This only works once deployed to Vercel with a KV database attached** — it will not work with `npm run dev` locally unless you also set up KV env vars locally (optional, see below).

### 1. Create a KV database
1. Deploy this project to Vercel first (see Deploy steps above).
2. In your Vercel project dashboard, go to the **Storage** tab.
3. Click **Create Database** → choose **KV** (powered by Upstash Redis) → follow the prompts.
4. Once created, click **Connect Project** and select this project. Vercel automatically adds the required environment variables (`KV_REST_API_URL`, `KV_REST_API_TOKEN`, etc.) — no manual copy-pasting needed.
5. Redeploy the project (Vercel usually prompts you to, or push a new commit) so the function picks up the new env vars.

### 2. Test it
Visit your deployed site, go to the **Leaderboard** tab, enter a name, and hit Submit. Open the site in another browser/incognito window — you should see the same entry appear.

### 3. (Optional) Run the API locally
```bash
npm i -g vercel
vercel link        # link this folder to your Vercel project
vercel env pull .env.local   # pulls the KV credentials down locally
vercel dev         # runs both the Vite frontend and the /api functions together
```
(Running plain `npm run dev` with Vite alone will NOT serve `/api/leaderboard` — use `vercel dev` for local testing of the leaderboard.)

### Notes
- Each name overwrites its own previous score **for that week** (last submission wins) — students should keep the same display name to update their rank rather than create a duplicate entry.
- The leaderboard shows the top 50 entries for the current week, sorted by hours descending.
- Weekly buckets are keyed by ISO week (e.g. `2026-W27`), computed from the server's clock — a fresh, empty leaderboard starts automatically every Monday. Old weeks' data expires from storage ~2 weeks after last activity.
- There is currently no login/auth — anyone can submit any name and hours value in this basic version. Fine for a class/friend-group leaderboard; not tamper-proof for a public deployment.

## Project structure

```
studyflow/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── vercel.json
├── api/
│   └── leaderboard.ts     # Serverless function backing the online leaderboard
└── src/
    ├── main.tsx           # React entry point
    ├── index.css          # Tailwind directives
    └── StudentDashboard.tsx  # Main dashboard component
```
