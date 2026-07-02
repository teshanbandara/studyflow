import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import StudentDashboard from "./StudentDashboard";
import Landing from "./Landing";
import "./index.css";

const AUTH_KEY = "spd_auth_user";

function Root() {
  const [username, setUsername] = useState<string | null>(() => localStorage.getItem(AUTH_KEY));

  const handleAuthed = (name: string) => {
    localStorage.setItem(AUTH_KEY, name);
    // Reuse the same key the leaderboard already reads/writes, so logging
    // in automatically becomes your leaderboard display name too - no
    // separate manual entry needed.
    localStorage.setItem("spd_leaderboard_name", name);
    setUsername(name);
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_KEY);
    setUsername(null);
  };

  if (!username) return <Landing onAuthed={handleAuthed} />;
  return <StudentDashboard username={username} onLogout={handleLogout} />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
