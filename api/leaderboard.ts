import { kv } from "@vercel/kv";
import type { VercelRequest, VercelResponse } from "@vercel/node";

// Storage design:
// - A Redis sorted set per ISO week, e.g. "leaderboard:2026-W27", maps
//   name -> hours (the score). Bucketing by week means the leaderboard
//   naturally "resets" every Monday without needing a cron job - a new
//   empty sorted set just starts being used once the week key changes.
// - Names are trimmed and capped at 24 chars, and each name overwrites its
//   own previous entry for the week (last submission wins) rather than
//   creating duplicates.
// - The week key is computed from the server's clock (UTC), not sent by the
//   client, so it can't be spoofed and always matches "the current week"
//   consistently for everyone.

const MAX_ENTRIES = 50;

function isoWeekKey(d: Date = new Date()): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = date.getUTCDay() || 7; // Mon=1..Sun=7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  const week = isoWeekKey();
  const key = `leaderboard:${week}`;

  if (req.method === "GET") {
    try {
      const raw = await kv.zrange<string[]>(key, 0, MAX_ENTRIES - 1, {
        rev: true,
        withScores: true,
      });
      const entries: { name: string; hours: number }[] = [];
      for (let i = 0; i < raw.length; i += 2) {
        entries.push({ name: String(raw[i]), hours: Number(raw[i + 1]) });
      }
      return res.status(200).json({ entries, week });
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

      await kv.zadd(key, { score: hours, member: name });
      // Auto-expire the week's key ~2 weeks after it was last written to,
      // so old weekly leaderboards don't accumulate in storage forever.
      await kv.expire(key, 60 * 60 * 24 * 14);
      return res.status(200).json({ ok: true, week });
    } catch (err) {
      return res.status(500).json({ error: "Failed to submit score" });
    }
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed" });
}
