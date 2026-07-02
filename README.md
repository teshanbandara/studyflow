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
└── src/
    ├── main.tsx           # React entry point
    ├── index.css          # Tailwind directives
    └── StudentDashboard.tsx  # Main dashboard component
```
