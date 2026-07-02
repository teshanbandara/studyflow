import React, { useState } from "react";

interface LandingProps {
  onAuthed: (username: string) => void;
}

export default function Landing({ onAuthed }: LandingProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) { setError("Enter a username."); return; }
    if (password.length < 4) { setError("Password must be at least 4 characters."); return; }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: mode, username: trimmed, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ? `${data.error}${data.detail ? ` (${data.detail})` : ""}` : "Something went wrong.");
        return;
      }
      onAuthed(data.username);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden flex flex-col">
      {/* Ambient gradient glow, quiet and off to the side rather than centered/loud */}
      <div className="pointer-events-none absolute -top-40 -right-40 h-[32rem] w-[32rem] rounded-full bg-violet-600/20 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-[28rem] w-[28rem] rounded-full bg-indigo-600/10 blur-[120px]" />

      <header className="relative z-10 px-6 sm:px-10 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center font-bold text-sm">S</div>
          <span className="font-semibold tracking-tight">StudyFlow</span>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex items-center">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 py-12 grid lg:grid-cols-2 gap-16 items-center w-full">
          {/* Left: pitch */}
          <div>
            <p className="text-xs font-medium tracking-widest text-violet-400 uppercase mb-4">Built for A/L students</p>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1] mb-6">
              Study hours,<br />
              <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">made visible.</span>
            </h1>
            <p className="text-slate-400 text-base sm:text-lg leading-relaxed mb-8 max-w-md">
              Track tasks, run focus sessions, and see exactly how your week stacks up — against your own goals, and against the class leaderboard.
            </p>
            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-400 shrink-0" />
                A focus timer that survives locked screens and backgrounded tabs
              </li>
              <li className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-400 shrink-0" />
                Habits, goals, exam countdowns, and daily reflection in one place
              </li>
              <li className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-400 shrink-0" />
                A weekly leaderboard that updates itself after every session
              </li>
            </ul>
          </div>

          {/* Right: auth card */}
          <div className="w-full max-w-sm mx-auto lg:mx-0 lg:ml-auto">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-8 shadow-2xl">
              <div className="flex gap-1 p-1 rounded-xl bg-white/5 mb-6">
                <button
                  onClick={() => { setMode("login"); setError(null); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${mode === "login" ? "bg-white text-slate-950" : "text-slate-400 hover:text-white"}`}
                >
                  Log in
                </button>
                <button
                  onClick={() => { setMode("signup"); setError(null); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${mode === "signup" ? "bg-white text-slate-950" : "text-slate-400 hover:text-white"}`}
                >
                  Sign up
                </button>
              </div>

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-400">Username</label>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    maxLength={24}
                    autoComplete="username"
                    placeholder="e.g. nimal_s"
                    className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm outline-none focus:border-violet-400/50 transition"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    placeholder="At least 4 characters"
                    className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm outline-none focus:border-violet-400/50 transition"
                  />
                </div>
                {error && <p className="text-xs text-rose-400">{error}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 font-medium text-sm hover:opacity-90 transition disabled:opacity-50"
                >
                  {submitting ? (mode === "login" ? "Logging in..." : "Creating account...") : mode === "login" ? "Log in" : "Create account"}
                </button>
              </form>

              <p className="text-xs text-slate-500 text-center mt-5">
                {mode === "login" ? "New here? " : "Already have an account? "}
                <button
                  onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); }}
                  className="text-violet-400 hover:text-violet-300 transition"
                >
                  {mode === "login" ? "Create an account" : "Log in instead"}
                </button>
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 px-6 sm:px-10 py-6 text-center text-xs text-slate-600">
        Your data stays on this device — only your name and weekly hours are shared for the leaderboard.
      </footer>
    </div>
  );
}
