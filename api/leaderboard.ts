import { put, head } from "@vercel/blob";
import type { VercelRequest, VercelResponse } from "@vercel/node";

// Storage design:
// - Vercel Blob (free tier) stores one small JSON file per ISO week, e.g.
//   "leaderboard/2026-W27.json", containing an array of {name, hours}.
//   Bucketing by week means the leaderboard naturally "resets" every Monday
//   - a fresh, empty file just starts being used once the week key changes.
// - Each POST reads the current file (if any), upserts the submitter's
//   entry (last submission for that name wins), sorts by hours descending,
//   and overwrites the file. This is fine for low/moderate traffic (a class
//   or friend group); it is not built to handle many simultaneous writers
//   racing each other, since there's no locking - the last write wins.
// - GET returns the top 50 entries for display, plus (if ?name= is passed)
//   that student's own rank/hours computed against the FULL list - so
//   someone ranked #73 still finds out they're #73 even though only the
//   top 50 are shown in the list itself.
// - The week key is computed from the server's clock (UTC), not sent by the
//   client, so it can't be spoofed and always matches "the current week"
//   consistently for everyone.

const DISPLAY_LIMIT = 50;
const STORAGE_LIMIT = 500;

interface Entry {
  name: string;
  hours: number;
  updatedAt: string;
}

function isoWeekKey(d: Date = new Date()): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = date.getUTCDay() || 7; // Mon=1..Sun=7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

async function readEntries(pathname: string): Promise<Entry[]> {
  try {
    const meta = await head(pathname);
    // Private Blob stores don't allow unauthenticated reads of the URL, so
    // we pass the token explicitly here rather than a plain fetch().
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const res = await fetch(meta.url, {
      cache: "no-store",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    // No blob for this week yet
    return [];
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");

  // Note: we intentionally don't hard-check for BLOB_READ_WRITE_TOKEN here.
  // Vercel now authenticates connected Blob stores via OIDC automatically
  // once the project is deployed with the store connected, so that env var
  // may not be present at all. If the store truly isn't connected, the
  // @vercel/blob calls below will throw and get caught, returning a clear
  // error instead of crashing.

  const week = isoWeekKey();
  const pathname = `leaderboard/${week}.json`;

  if (req.method === "GET") {
    try {
      const entries = await readEntries(pathname);
      entries.sort((a, b) => b.hours - a.hours);

      const name = String(req.query?.name || "").trim().slice(0, 24);
      const idx = name ? entries.findIndex((e) => e.name === name) : -1;

      return res.status(200).json({
        week,
        total: entries.length,
        entries: entries.slice(0, DISPLAY_LIMIT).map((e) => ({ name: e.name, hours: e.hours })),
        rank: idx === -1 ? null : idx + 1,
        hours: idx === -1 ? null : entries[idx].hours,
      });
    } catch (err) {
      return res.status(500).json({ error: "Failed to load leaderboard" });
    }
  }

  if (req.method === "POST") {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const name = String(body?.name || "").trim().slice(0, 24);
      const hours = Number(body?.hours);

      if (!name) return res.status(400).json({ error: "Name is required" });
      if (!Number.isFinite(hours) || hours < 0 || hours > 168) {
        return res.status(400).json({ error: "Invalid hours value" });
      }

      const entries = await readEntries(pathname);
      const idx = entries.findIndex((e) => e.name === name);
      const entry: Entry = { name, hours, updatedAt: new Date().toISOString() };
      if (idx === -1) entries.push(entry);
      else entries[idx] = entry;
      entries.sort((a, b) => b.hours - a.hours);

      await put(pathname, JSON.stringify(entries.slice(0, STORAGE_LIMIT)), {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: true,
      });

      const rank = entries.findIndex((e) => e.name === name) + 1;
      return res.status(200).json({
        ok: true,
        week,
        rank,
        total: entries.length,
        hours,
        entries: entries.slice(0, DISPLAY_LIMIT).map((e) => ({ name: e.name, hours: e.hours })),
      });
    } catch (err) {
      return res.status(500).json({
        error: "Failed to submit score. Make sure a Blob store is connected to this project in Storage settings.",
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed" });
}
