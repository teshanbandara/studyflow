import { put, head } from "@vercel/blob";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";

// Storage design:
// - A single JSON blob "auth/users.json" holds all accounts as
//   { username: { salt, hash, createdAt } }. Small scale (a class/friend
//   group), so one file is fine - same trade-off as the leaderboard file
//   (no locking, last write wins on concurrent signups, which is very
//   unlikely to collide in practice for personal-scale use).
// - Passwords are hashed with scrypt (Node's built-in, no extra
//   dependency) + a per-user random salt. Never stored in plain text.
// - "Session" is intentionally lightweight: on success we just return the
//   username, which the client stores locally and treats as "logged in".
//   There's no server-issued session token/cookie. This is fine for a
//   low-stakes study-tracking app but is NOT bank-grade auth - don't reuse
//   this pattern for anything sensitive.

const USERS_PATH = "auth/users.json";

interface UserRecord {
  salt: string;
  hash: string;
  createdAt: string;
}
type UsersFile = Record<string, UserRecord>;

async function readUsers(): Promise<UsersFile> {
  try {
    const meta = await head(USERS_PATH);
    const res = await fetch(meta.url, { cache: "no-store" });
    if (!res.ok) return {};
    const data = await res.json();
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

async function writeUsers(users: UsersFile) {
  await put(USERS_PATH, JSON.stringify(users), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString("hex");
}

function normalizeUsername(raw: unknown): string {
  return String(raw || "").trim().slice(0, 24);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const action = body?.action;
    const username = normalizeUsername(body?.username);
    const password = String(body?.password || "");

    if (!username) return res.status(400).json({ error: "Username is required" });
    if (!password || password.length < 4) {
      return res.status(400).json({ error: "Password must be at least 4 characters" });
    }

    const users = await readUsers();

    if (action === "signup") {
      if (users[username]) {
        return res.status(409).json({ error: "That username is already taken" });
      }
      const salt = randomBytes(16).toString("hex");
      const hash = hashPassword(password, salt);
      users[username] = { salt, hash, createdAt: new Date().toISOString() };
      await writeUsers(users);
      return res.status(200).json({ ok: true, username });
    }

    if (action === "login") {
      const record = users[username];
      if (!record) return res.status(401).json({ error: "Incorrect username or password" });
      const attemptHash = hashPassword(password, record.salt);
      const a = Buffer.from(attemptHash, "hex");
      const b = Buffer.from(record.hash, "hex");
      const match = a.length === b.length && timingSafeEqual(a, b);
      if (!match) return res.status(401).json({ error: "Incorrect username or password" });
      return res.status(200).json({ ok: true, username });
    }

    return res.status(400).json({ error: "Invalid action" });
  } catch (err) {
    return res.status(500).json({
      error: "Something went wrong. Make sure a Blob store is connected to this project.",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}
