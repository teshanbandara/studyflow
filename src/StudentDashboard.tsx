import React, { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutGrid, CheckSquare, BookOpen, Timer, BarChart3, Flame, CalendarDays,
  StickyNote, Target, GraduationCap, Trophy, ClipboardList, Settings as SettingsIcon,
  Search, Sun, Moon, Plus, Trash2, Pencil, X, Check, ChevronLeft, ChevronRight,
  Play, Pause, RotateCcw, Bell, Download, Upload, Sparkles, Clock, Droplet,
  Dumbbell, BookMarked, Moon as MoonIcon, GripVertical, Star, Award
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line
} from "recharts";

/* ============================== Types ============================== */

type Priority = "high" | "medium" | "low";

interface Subject {
  id: string;
  name: string;
  color: string; // tailwind color key
  custom?: boolean;
}

interface Task {
  id: string;
  title: string;
  subjectId: string;
  priority: Priority;
  duration: number; // minutes
  notes: string;
  done: boolean;
  order: number;
  createdAt: string;
  completedAt?: string;
  date: string; // yyyy-mm-dd, the day the task belongs to
}

interface Habit {
  id: string;
  name: string;
  icon: string;
  custom?: boolean;
  dates: string[]; // completed yyyy-mm-dd
}

interface Exam {
  id: string;
  name: string;
  subjectId: string;
  date: string; // yyyy-mm-dd
}

interface Goal {
  id: string;
  text: string;
  period: "daily" | "weekly" | "monthly";
  done: boolean;
  createdAt: string;
}

interface NoteItem {
  id: string;
  title: string;
  content: string;
  checklist: { id: string; text: string; done: boolean }[];
  updatedAt: string;
}

interface DailyLog {
  date: string;
  studyMinutes: number;
  pomodoros: number;
}

interface Achievement {
  id: string;
  title: string;
  desc: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
}

interface Reflection {
  date: string;
  reflection: string;
  planTomorrow: string;
}

/* ============================== Storage hook ============================== */

function useLocalStorage<T>(key: string, initial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue];
}

/* ============================== Helpers ============================== */

const todayStr = () => new Date().toISOString().slice(0, 10);
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

const QUOTES = [
  "Small steps every day lead to big results.",
  "Discipline is choosing between what you want now and what you want most.",
  "The expert in anything was once a beginner.",
  "Focus on progress, not perfection.",
  "Your future is created by what you do today, not tomorrow.",
  "Success is the sum of small efforts repeated daily.",
  "Study while others sleep; win while others hope.",
  "A little progress each day adds up to big results.",
  "Push yourself, because no one else is going to do it for you.",
  "Don't watch the clock; do what it does — keep going.",
];

const TIPS = [
  "Try the 25/5 Pomodoro rhythm to stay sharp without burning out.",
  "Review your notes within 24 hours to boost retention by 60%.",
  "Teach a concept out loud — if you can explain it, you know it.",
  "Tackle your hardest subject first, while your mind is fresh.",
  "Take a 5-minute walk between sessions to reset focus.",
  "Summarize each chapter in 3 sentences before moving on.",
  "Sleep is a study tool — memories consolidate while you rest.",
  "Break big tasks into 20-minute chunks to beat procrastination.",
];

function dayOfYear(d: Date) {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

const ACCENTS: Record<string, { name: string; solid: string; text: string; bg: string; ring: string; from: string; to: string; light: string }> = {
  violet: { name: "Violet", solid: "bg-violet-600", text: "text-violet-600", bg: "bg-violet-500", ring: "ring-violet-500", from: "from-violet-500", to: "to-indigo-500", light: "bg-violet-50" },
  blue: { name: "Blue", solid: "bg-blue-600", text: "text-blue-600", bg: "bg-blue-500", ring: "ring-blue-500", from: "from-blue-500", to: "to-cyan-500", light: "bg-blue-50" },
  emerald: { name: "Emerald", solid: "bg-emerald-600", text: "text-emerald-600", bg: "bg-emerald-500", ring: "ring-emerald-500", from: "from-emerald-500", to: "to-teal-500", light: "bg-emerald-50" },
  rose: { name: "Rose", solid: "bg-rose-600", text: "text-rose-600", bg: "bg-rose-500", ring: "ring-rose-500", from: "from-rose-500", to: "to-pink-500", light: "bg-rose-50" },
  amber: { name: "Amber", solid: "bg-amber-600", text: "text-amber-600", bg: "bg-amber-500", ring: "ring-amber-500", from: "from-amber-500", to: "to-orange-500", light: "bg-amber-50" },
};

const SUBJECT_COLORS: Record<string, { dot: string; text: string; bg: string; border: string }> = {
  blue: { dot: "bg-blue-500", text: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10", border: "border-blue-200 dark:border-blue-500/30" },
  emerald: { dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", border: "border-emerald-200 dark:border-emerald-500/30" },
  rose: { dot: "bg-rose-500", text: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-500/10", border: "border-rose-200 dark:border-rose-500/30" },
  amber: { dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10", border: "border-amber-200 dark:border-amber-500/30" },
  violet: { dot: "bg-violet-500", text: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-500/10", border: "border-violet-200 dark:border-violet-500/30" },
  cyan: { dot: "bg-cyan-500", text: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-50 dark:bg-cyan-500/10", border: "border-cyan-200 dark:border-cyan-500/30" },
  pink: { dot: "bg-pink-500", text: "text-pink-600 dark:text-pink-400", bg: "bg-pink-50 dark:bg-pink-500/10", border: "border-pink-200 dark:border-pink-500/30" },
  lime: { dot: "bg-lime-500", text: "text-lime-600 dark:text-lime-400", bg: "bg-lime-50 dark:bg-lime-500/10", border: "border-lime-200 dark:border-lime-500/30" },
  orange: { dot: "bg-orange-500", text: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-500/10", border: "border-orange-200 dark:border-orange-500/30" },
  slate: { dot: "bg-slate-500", text: "text-slate-600 dark:text-slate-400", bg: "bg-slate-50 dark:bg-slate-500/10", border: "border-slate-200 dark:border-slate-500/30" },
};

const DEFAULT_SUBJECTS: Subject[] = [
  { id: "physics", name: "Physics", color: "blue" },
  { id: "chemistry", name: "Chemistry", color: "emerald" },
  { id: "biology", name: "Biology", color: "rose" },
  { id: "maths", name: "Combined Maths", color: "violet" },
  { id: "ict", name: "ICT", color: "cyan" },
  { id: "english", name: "English", color: "amber" },
];

const DEFAULT_HABITS: Habit[] = [
  { id: "water", name: "Drink Water", icon: "droplet", dates: [] },
  { id: "exercise", name: "Exercise", icon: "dumbbell", dates: [] },
  { id: "revise", name: "Revise", icon: "book", dates: [] },
  { id: "notes", name: "Read Notes", icon: "notes", dates: [] },
  { id: "sleep", name: "Sleep Early", icon: "moon", dates: [] },
];

const ACHIEVEMENT_DEFS: Omit<Achievement, "unlocked" | "unlockedAt">[] = [
  { id: "first-task", title: "First Task", desc: "Complete your very first task", icon: "check" },
  { id: "first-pomodoro", title: "First Pomodoro", desc: "Finish one focus session", icon: "timer" },
  { id: "streak-7", title: "7-Day Streak", desc: "Study 7 days in a row", icon: "flame" },
  { id: "perfect-week", title: "Perfect Week", desc: "Complete all tasks 7 days running", icon: "star" },
  { id: "100-hours", title: "100 Study Hours", desc: "Accumulate 100 hours of study", icon: "award" },
];

const HABIT_ICONS: Record<string, React.ElementType> = {
  droplet: Droplet, dumbbell: Dumbbell, book: BookMarked, notes: StickyNote, moon: MoonIcon,
};

/* ============================== Context ============================== */

interface AppCtx {
  dark: boolean;
  accent: string;
}
const Ctx = createContext<AppCtx>({ dark: false, accent: "violet" });

/* ============================== Small UI atoms ============================== */

const GlassCard: React.FC<React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }> = ({ className = "", children, ...rest }) => (
  <div
    className={`rounded-3xl border border-white/60 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl shadow-sm shadow-slate-900/5 ${className}`}
    {...rest}
  >
    {children}
  </div>
);

const SectionTitle: React.FC<{ icon: React.ElementType; title: string; subtitle?: string; right?: React.ReactNode }> = ({ icon: Icon, title, subtitle, right }) => {
  const { accent } = useContext(Ctx);
  const a = ACCENTS[accent];
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <div className={`h-9 w-9 rounded-xl ${a.light} dark:bg-white/10 flex items-center justify-center`}>
          <Icon className={`h-4.5 w-4.5 ${a.text}`} size={18} />
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  );
};

const PriorityBadge: React.FC<{ p: Priority }> = ({ p }) => {
  const map = {
    high: "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30",
    medium: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30",
    low: "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/30",
  };
  return <span className={`text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full border ${map[p]}`}>{p}</span>;
};

/* ============================== Confetti ============================== */

const Confetti: React.FC = () => {
  const { accent } = useContext(Ctx);
  const colors = ["bg-rose-400", "bg-amber-400", "bg-emerald-400", "bg-blue-400", "bg-violet-400"];
  const pieces = useMemo(() => Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.4,
    color: colors[i % colors.length],
    rotate: Math.random() * 360,
    size: 6 + Math.random() * 6,
  })), []);
  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          className={`absolute ${p.color} rounded-sm`}
          style={{ left: `${p.x}%`, width: p.size, height: p.size * 0.5, top: -20 }}
          initial={{ y: -20, opacity: 1, rotate: 0 }}
          animate={{ y: "110vh", opacity: 0, rotate: p.rotate }}
          transition={{ duration: 2.2 + Math.random(), delay: p.delay, ease: "easeIn" }}
        />
      ))}
    </div>
  );
};

/* ============================== Toasts ============================== */

interface Toast { id: string; text: string; icon?: React.ElementType }
const ToastStack: React.FC<{ toasts: Toast[] }> = ({ toasts }) => (
  <div className="fixed top-4 right-4 z-[90] flex flex-col gap-2 w-72">
    <AnimatePresence>
      {toasts.map((t) => (
        <motion.div
          key={t.id}
          initial={{ opacity: 0, x: 40, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 40, scale: 0.9 }}
          className="rounded-2xl border border-white/60 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-lg px-4 py-3 flex items-center gap-3"
        >
          {t.icon && <t.icon className="h-4 w-4 text-slate-500 dark:text-slate-400 shrink-0" />}
          <p className="text-xs text-slate-700 dark:text-slate-200">{t.text}</p>
        </motion.div>
      ))}
    </AnimatePresence>
  </div>
);

/* ============================== Main App ============================== */

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "subjects", label: "Subjects", icon: BookOpen },
  { id: "focus", label: "Focus Timer", icon: Timer },
  { id: "stats", label: "Statistics", icon: BarChart3 },
  { id: "habits", label: "Habits", icon: Flame },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "notes", label: "Notes", icon: StickyNote },
  { id: "goals", label: "Goals", icon: Target },
  { id: "exams", label: "Exams", icon: GraduationCap },
  { id: "achievements", label: "Achievements", icon: Trophy },
  { id: "review", label: "Daily Review", icon: ClipboardList },
  { id: "settings", label: "Settings", icon: SettingsIcon },
] as const;

type NavId = typeof NAV[number]["id"];

export default function App() {
  const [dark, setDark] = useLocalStorage("spd_dark", false);
  const [accent, setAccent] = useLocalStorage("spd_accent", "violet");
  const [pomodoroLen, setPomodoroLen] = useLocalStorage("spd_pomo_len", 25);
  const [breakLen, setBreakLen] = useLocalStorage("spd_break_len", 5);
  const [notifOn, setNotifOn] = useLocalStorage("spd_notif", true);

  const [subjects, setSubjects] = useLocalStorage<Subject[]>("spd_subjects", DEFAULT_SUBJECTS);
  const [tasks, setTasks] = useLocalStorage<Task[]>("spd_tasks", []);
  const [habits, setHabits] = useLocalStorage<Habit[]>("spd_habits", DEFAULT_HABITS);
  const [exams, setExams] = useLocalStorage<Exam[]>("spd_exams", []);
  const [goals, setGoals] = useLocalStorage<Goal[]>("spd_goals", []);
  const [notes, setNotes] = useLocalStorage<NoteItem[]>("spd_notes", []);
  const [logs, setLogs] = useLocalStorage<DailyLog[]>("spd_logs", []);
  const [achievements, setAchievements] = useLocalStorage<Achievement[]>(
    "spd_achievements",
    ACHIEVEMENT_DEFS.map((a) => ({ ...a, unlocked: false }))
  );
  const [reflections, setReflections] = useLocalStorage<Reflection[]>("spd_reflections", []);

  const [active, setActive] = useState<NavId>("dashboard");
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const pushToast = useCallback((text: string, icon?: React.ElementType) => {
    const id = uid();
    setToasts((t) => [...t, { id, text, icon }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  // keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowSearch(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setShowQuickAdd(true);
      }
      if (e.key === "Escape") {
        setShowSearch(false);
        setShowQuickAdd(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const today = todayStr();
  const todayTasks = useMemo(() => tasks.filter((t) => t.date === today).sort((a, b) => a.order - b.order), [tasks, today]);
  const completedToday = todayTasks.filter((t) => t.done).length;
  const progressPct = todayTasks.length ? Math.round((completedToday / todayTasks.length) * 100) : 0;
  const todayLog = logs.find((l) => l.date === today) || { date: today, studyMinutes: 0, pomodoros: 0 };

  const streak = useMemo(() => {
    let s = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const hasActivity = logs.some((l) => l.date === ds && (l.studyMinutes > 0 || l.pomodoros > 0)) || tasks.some((t) => t.date === ds && t.done);
      if (hasActivity) s++;
      else if (i === 0) continue; // today may not have activity yet, don't break
      else break;
    }
    return s;
  }, [logs, tasks]);

  const productivityScore = useMemo(() => {
    const taskScore = todayTasks.length ? (completedToday / todayTasks.length) * 40 : 20;
    const pomScore = Math.min(todayLog.pomodoros, 6) / 6 * 30;
    const habitScore = habits.length ? (habits.filter((h) => h.dates.includes(today)).length / habits.length) * 20 : 0;
    const streakScore = Math.min(streak, 10) / 10 * 10;
    return Math.round(taskScore + pomScore + habitScore + streakScore);
  }, [todayTasks, completedToday, todayLog, habits, today, streak]);

  const quote = QUOTES[dayOfYear(now) % QUOTES.length];
  const tip = TIPS[dayOfYear(now) % TIPS.length];

  // unlock achievements
  useEffect(() => {
    setAchievements((prev) => {
      let changed = false;
      const totalHours = logs.reduce((s, l) => s + l.studyMinutes, 0) / 60;
      const totalPomodoros = logs.reduce((s, l) => s + l.pomodoros, 0);
      const anyTaskDone = tasks.some((t) => t.done);
      const perfectWeekDays = (() => {
        let count = 0;
        for (let i = 0; i < 7; i++) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const ds = d.toISOString().slice(0, 10);
          const dayTasks = tasks.filter((t) => t.date === ds);
          if (dayTasks.length > 0 && dayTasks.every((t) => t.done)) count++;
        }
        return count;
      })();
      const next = prev.map((a) => {
        if (a.unlocked) return a;
        let unlock = false;
        if (a.id === "first-task" && anyTaskDone) unlock = true;
        if (a.id === "first-pomodoro" && totalPomodoros >= 1) unlock = true;
        if (a.id === "streak-7" && streak >= 7) unlock = true;
        if (a.id === "perfect-week" && perfectWeekDays >= 7) unlock = true;
        if (a.id === "100-hours" && totalHours >= 100) unlock = true;
        if (unlock) {
          changed = true;
          pushToast(`Achievement unlocked: ${a.title}`, Trophy);
          return { ...a, unlocked: true, unlockedAt: todayStr() };
        }
        return a;
      });
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, logs, streak]);

  const logStudyMinutes = useCallback((mins: number, pomodoro = false) => {
    setLogs((prev) => {
      const idx = prev.findIndex((l) => l.date === today);
      if (idx === -1) return [...prev, { date: today, studyMinutes: mins, pomodoros: pomodoro ? 1 : 0 }];
      const copy = [...prev];
      copy[idx] = { ...copy[idx], studyMinutes: copy[idx].studyMinutes + mins, pomodoros: copy[idx].pomodoros + (pomodoro ? 1 : 0) };
      return copy;
    });
  }, [today, setLogs]);

  const addSubjectRef = useRef<Subject[]>(subjects);
  addSubjectRef.current = subjects;

  const exportData = () => {
    const data = { subjects, tasks, habits, exams, goals, notes, logs, achievements, reflections };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `study-dashboard-backup-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast("Data exported successfully", Download);
  };

  const importData = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (data.subjects) setSubjects(data.subjects);
        if (data.tasks) setTasks(data.tasks);
        if (data.habits) setHabits(data.habits);
        if (data.exams) setExams(data.exams);
        if (data.goals) setGoals(data.goals);
        if (data.notes) setNotes(data.notes);
        if (data.logs) setLogs(data.logs);
        if (data.achievements) setAchievements(data.achievements);
        if (data.reflections) setReflections(data.reflections);
        pushToast("Data imported successfully", Upload);
      } catch {
        pushToast("Import failed — invalid file", X);
      }
    };
    reader.readAsText(file);
  };

  const resetAll = () => {
    if (!confirm("This will permanently erase all your data. Continue?")) return;
    [
      "spd_subjects", "spd_tasks", "spd_habits", "spd_exams", "spd_goals",
      "spd_notes", "spd_logs", "spd_achievements", "spd_reflections",
    ].forEach((k) => localStorage.removeItem(k));
    window.location.reload();
  };

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return tasks.filter((t) => t.title.toLowerCase().includes(q) || t.notes.toLowerCase().includes(q)).slice(0, 8);
  }, [search, tasks]);

  const a = ACCENTS[accent];
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";

  return (
    <Ctx.Provider value={{ dark, accent }}>
      <div className={`min-h-screen w-full transition-colors duration-500 ${dark ? "dark" : ""}`}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 text-slate-900 dark:text-slate-100 flex font-sans">
          {/* Sidebar */}
          <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-slate-200/70 dark:border-white/10 p-4 gap-1">
            <div className="flex items-center gap-2 px-2 py-3 mb-2">
              <div className={`h-8 w-8 rounded-xl bg-gradient-to-br ${a.from} ${a.to} flex items-center justify-center shadow-md`}>
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold tracking-tight">StudyFlow</span>
            </div>
            {NAV.map((n) => {
              const Icon = n.icon;
              const isActive = active === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => setActive(n.id)}
                  className={`group flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all relative ${
                    isActive
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-medium shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {n.label}
                </button>
              );
            })}
          </aside>

          {/* Mobile bottom nav */}
          <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 flex overflow-x-auto no-scrollbar px-1 py-1">
            {NAV.map((n) => {
              const Icon = n.icon;
              const isActive = active === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => setActive(n.id)}
                  className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-lg min-w-[64px] text-[10px] ${
                    isActive ? `${a.text} font-medium` : "text-slate-400"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {n.label.split(" ")[0]}
                </button>
              );
            })}
          </div>

          {/* Main */}
          <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0">
            {/* Topbar */}
            <header className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 md:px-8 py-4 bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl border-b border-slate-200/60 dark:border-white/10">
              <div className="min-w-0">
                <h1 className="text-base md:text-lg font-semibold tracking-tight truncate">{NAV.find((n) => n.id === active)?.label}</h1>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSearch(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 dark:border-white/10 text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Search</span>
                  <kbd className="hidden sm:inline text-[10px] bg-slate-100 dark:bg-white/10 px-1 rounded">⌘K</kbd>
                </button>
                <button
                  onClick={() => setShowQuickAdd(true)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full ${a.solid} text-white text-xs font-medium shadow-sm hover:opacity-90 transition`}
                >
                  <Plus className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Quick Add</span>
                </button>
                <button
                  onClick={() => setDark((d) => !d)}
                  className="h-8 w-8 rounded-full border border-slate-200 dark:border-white/10 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/5 transition"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span key={dark ? "moon" : "sun"} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                      {dark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                    </motion.span>
                  </AnimatePresence>
                </button>
              </div>
            </header>

            {/* Content */}
            <main className="flex-1 px-4 md:px-8 py-6 max-w-7xl w-full mx-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  {active === "dashboard" && (
                    <Dashboard
                      greeting={greeting} now={now} quote={quote} tip={tip}
                      score={productivityScore} streak={streak} progressPct={progressPct}
                      completedToday={completedToday} totalToday={todayTasks.length}
                      todayLog={todayLog} tasks={todayTasks} subjects={subjects}
                      goToTasks={() => setActive("tasks")} goToFocus={() => setActive("focus")}
                    />
                  )}
                  {active === "tasks" && (
                    <TasksPanel
                      tasks={tasks} setTasks={setTasks} subjects={subjects} today={today}
                      onCompleteAll={() => setConfetti(true)} pushToast={pushToast}
                    />
                  )}
                  {active === "subjects" && <SubjectsPanel subjects={subjects} setSubjects={setSubjects} tasks={tasks} />}
                  {active === "focus" && (
                    <FocusPanel
                      pomodoroLen={pomodoroLen} breakLen={breakLen}
                      setPomodoroLen={setPomodoroLen} setBreakLen={setBreakLen}
                      onSessionComplete={(mins) => { logStudyMinutes(mins, true); pushToast("Focus session complete — take a break!", Bell); }}
                      notifOn={notifOn}
                    />
                  )}
                  {active === "stats" && <StatsPanel logs={logs} tasks={tasks} subjects={subjects} />}
                  {active === "habits" && <HabitsPanel habits={habits} setHabits={setHabits} today={today} />}
                  {active === "calendar" && <CalendarPanel tasks={tasks} logs={logs} />}
                  {active === "notes" && <NotesPanel notes={notes} setNotes={setNotes} />}
                  {active === "goals" && <GoalsPanel goals={goals} setGoals={setGoals} />}
                  {active === "exams" && <ExamsPanel exams={exams} setExams={setExams} subjects={subjects} />}
                  {active === "achievements" && <AchievementsPanel achievements={achievements} />}
                  {active === "review" && (
                    <ReviewPanel
                      tasks={todayTasks} completedToday={completedToday} todayLog={todayLog}
                      achievements={achievements} reflections={reflections} setReflections={setReflections} today={today}
                    />
                  )}
                  {active === "settings" && (
                    <SettingsPanel
                      dark={dark} setDark={setDark} accent={accent} setAccent={setAccent}
                      pomodoroLen={pomodoroLen} setPomodoroLen={setPomodoroLen}
                      breakLen={breakLen} setBreakLen={setBreakLen}
                      notifOn={notifOn} setNotifOn={setNotifOn}
                      onExport={exportData} onImport={importData} onReset={resetAll}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </main>
          </div>
        </div>

        <ToastStack toasts={toasts} />
        <AnimatePresence>{confetti && <ConfettiWrapper onDone={() => setConfetti(false)} />}</AnimatePresence>

        <AnimatePresence>
          {showSearch && (
            <SearchModal search={search} setSearch={setSearch} results={searchResults} subjects={subjects} onClose={() => { setShowSearch(false); setSearch(""); }} />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {showQuickAdd && (
            <QuickAddModal subjects={subjects} onClose={() => setShowQuickAdd(false)} onAdd={(t) => {
              setTasks((prev) => [...prev, t]);
              setShowQuickAdd(false);
              pushToast("Task added");
            }} today={today} existingCount={todayTasks.length} />
          )}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

const ConfettiWrapper: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone]);
  return <Confetti />;
};

/* ============================== Dashboard ============================== */

const LiveClock: React.FC<{ now: Date }> = ({ now }) => (
  <div className="font-mono text-4xl md:text-5xl font-semibold tracking-tight tabular-nums">
    {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
  </div>
);

const RadialScore: React.FC<{ score: number }> = ({ score }) => {
  const { accent } = useContext(Ctx);
  const a = ACCENTS[accent];
  const r = 46;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-32 w-32">
      <svg viewBox="0 0 110 110" className="h-32 w-32 -rotate-90">
        <circle cx="55" cy="55" r={r} fill="none" strokeWidth="10" className="stroke-slate-100 dark:stroke-white/10" />
        <motion.circle
          cx="55" cy="55" r={r} fill="none" strokeWidth="10" strokeLinecap="round"
          className={a.text.replace("text-", "stroke-")}
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (score / 100) * c }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold">{score}</span>
        <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">Score</span>
      </div>
    </div>
  );
};

const Dashboard: React.FC<{
  greeting: string; now: Date; quote: string; tip: string; score: number; streak: number;
  progressPct: number; completedToday: number; totalToday: number; todayLog: DailyLog;
  tasks: Task[]; subjects: Subject[]; goToTasks: () => void; goToFocus: () => void;
}> = ({ greeting, now, quote, tip, score, streak, progressPct, completedToday, totalToday, todayLog, tasks, subjects, goToTasks, goToFocus }) => {
  const { accent } = useContext(Ctx);
  const a = ACCENTS[accent];
  const dateStr = now.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="space-y-6">
      <GlassCard className={`p-6 md:p-8 bg-gradient-to-br ${a.from} ${a.to} border-0 text-white shadow-lg shadow-slate-900/10 relative overflow-hidden`}>
        <div className="absolute -right-10 -top-10 h-52 w-52 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p className="text-white/80 text-sm mb-1">{dateStr}</p>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-3">{greeting} ✨</h1>
            <p className="max-w-md text-white/90 text-sm italic">"{quote}"</p>
          </div>
          <LiveClock now={now} />
        </div>
      </GlassCard>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-5 flex flex-col items-center justify-center gap-2 text-center">
          <RadialScore score={score} />
          <p className="text-xs text-slate-500 dark:text-slate-400">Productivity Score</p>
        </GlassCard>

        <GlassCard className="p-5 flex flex-col justify-center gap-1">
          <div className="flex items-center gap-2 text-orange-500">
            <Flame className="h-5 w-5" />
            <span className="text-3xl font-bold tabular-nums">{streak}</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Day Study Streak</p>
        </GlassCard>

        <GlassCard className="p-5 flex flex-col justify-center gap-1">
          <div className="flex items-center gap-2">
            <Clock className={`h-5 w-5 ${a.text}`} />
            <span className="text-3xl font-bold tabular-nums">{(todayLog.studyMinutes / 60).toFixed(1)}h</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Studied Today</p>
        </GlassCard>

        <GlassCard className="p-5 flex flex-col justify-center gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">Today's Progress</span>
            <span className="text-xs font-medium">{completedToday}/{totalToday}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
            <motion.div className={`h-full rounded-full ${a.solid}`} initial={{ width: 0 }} animate={{ width: `${progressPct}%` }} transition={{ duration: 0.8, ease: "easeOut" }} />
          </div>
          <span className="text-lg font-semibold">{progressPct}%</span>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="p-6 lg:col-span-2">
          <SectionTitle icon={CheckSquare} title="Today's Tasks" subtitle={`${totalToday - completedToday} remaining`} right={
            <button onClick={goToTasks} className={`text-xs font-medium ${a.text} hover:underline`}>View all →</button>
          } />
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-400">No tasks yet today. Add one to get started.</div>
          ) : (
            <div className="space-y-2">
              {tasks.slice(0, 5).map((t) => {
                const subj = subjects.find((s) => s.id === t.subjectId);
                const c = subj ? SUBJECT_COLORS[subj.color] : SUBJECT_COLORS.slate;
                return (
                  <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition">
                    <div className={`h-2 w-2 rounded-full ${c.dot}`} />
                    <span className={`text-sm flex-1 truncate ${t.done ? "line-through text-slate-400" : ""}`}>{t.title}</span>
                    <PriorityBadge p={t.priority} />
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-6 flex flex-col justify-between">
          <SectionTitle icon={Sparkles} title="Daily Tip" />
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">{tip}</p>
          <button onClick={goToFocus} className={`mt-auto flex items-center justify-center gap-2 py-2.5 rounded-xl ${a.solid} text-white text-sm font-medium hover:opacity-90 transition`}>
            <Timer className="h-4 w-4" /> Start Focus Session
          </button>
        </GlassCard>
      </div>
    </div>
  );
};

/* ============================== Tasks ============================== */

const TasksPanel: React.FC<{
  tasks: Task[]; setTasks: React.Dispatch<React.SetStateAction<Task[]>>; subjects: Subject[]; today: string;
  onCompleteAll: () => void; pushToast: (t: string, i?: React.ElementType) => void;
}> = ({ tasks, setTasks, subjects, today, onCompleteAll, pushToast }) => {
  const { accent } = useContext(Ctx);
  const a = ACCENTS[accent];
  const [editing, setEditing] = useState<Task | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [lastDeleted, setLastDeleted] = useState<Task | null>(null);
  const [filter, setFilter] = useState<"all" | Priority>("all");

  const dayTasks = tasks.filter((t) => t.date === today).sort((a2, b2) => a2.order - b2.order);
  const filtered = filter === "all" ? dayTasks : dayTasks.filter((t) => t.priority === filter);
  const completed = dayTasks.filter((t) => t.done).length;
  const pct = dayTasks.length ? Math.round((completed / dayTasks.length) * 100) : 0;

  const toggleDone = (id: string) => {
    setTasks((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, done: !t.done, completedAt: !t.done ? new Date().toISOString() : undefined } : t));
      const dayNext = next.filter((t) => t.date === today);
      if (dayNext.length > 0 && dayNext.every((t) => t.done)) onCompleteAll();
      return next;
    });
  };

  const removeTask = (id: string) => {
    const t = tasks.find((x) => x.id === id);
    if (t) setLastDeleted(t);
    setTasks((prev) => prev.filter((x) => x.id !== id));
    pushToast("Task deleted — undo available");
  };

  const undoDelete = () => {
    if (lastDeleted) {
      setTasks((prev) => [...prev, lastDeleted]);
      setLastDeleted(null);
    }
  };

  const saveTask = (t: Task) => {
    setTasks((prev) => {
      const exists = prev.some((x) => x.id === t.id);
      return exists ? prev.map((x) => (x.id === t.id ? t : x)) : [...prev, t];
    });
    setShowForm(false);
    setEditing(null);
  };

  const onDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    setTasks((prev) => {
      const day = prev.filter((t) => t.date === today).sort((a2, b2) => a2.order - b2.order);
      const rest = prev.filter((t) => t.date !== today);
      const fromIdx = day.findIndex((t) => t.id === dragId);
      const toIdx = day.findIndex((t) => t.id === targetId);
      const reordered = [...day];
      const [moved] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, moved);
      reordered.forEach((t, i) => (t.order = i));
      return [...rest, ...reordered];
    });
    setDragId(null);
  };

  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <SectionTitle icon={CheckSquare} title="Today's Tasks" subtitle={`${completed}/${dayTasks.length} completed`} right={
          <button onClick={() => { setEditing(null); setShowForm(true); }} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl ${a.solid} text-white text-xs font-medium hover:opacity-90 transition`}>
            <Plus className="h-3.5 w-3.5" /> Add Task
          </button>
        } />
        <div className="h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden mb-4">
          <motion.div className={`h-full rounded-full ${a.solid}`} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} />
        </div>
        <div className="flex gap-2 mb-4">
          {(["all", "high", "medium", "low"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`text-xs px-3 py-1 rounded-full border transition ${filter === f ? `${a.solid} text-white border-transparent` : "border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400"}`}>
              {f[0].toUpperCase() + f.slice(1)}
            </button>
          ))}
          {lastDeleted && (
            <button onClick={undoDelete} className="text-xs px-3 py-1 rounded-full border border-amber-300 text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30 ml-auto">
              Undo delete
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-slate-400">No tasks match. Add your first task for today.</div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {filtered.map((t) => {
                const subj = subjects.find((s) => s.id === t.subjectId);
                const c = subj ? SUBJECT_COLORS[subj.color] : SUBJECT_COLORS.slate;
                return (
                  <motion.div
                    key={t.id}
                    layout
                    draggable
                    onDragStart={() => setDragId(t.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => onDrop(t.id)}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={`group flex items-start gap-3 p-3.5 rounded-2xl border ${c.border} ${c.bg} cursor-grab active:cursor-grabbing`}
                  >
                    <GripVertical className="h-4 w-4 text-slate-300 dark:text-slate-600 mt-1 shrink-0" />
                    <button onClick={() => toggleDone(t.id)} className="mt-0.5 shrink-0">
                      <motion.div whileTap={{ scale: 0.8 }} className={`h-5 w-5 rounded-md border-2 flex items-center justify-center transition ${t.done ? `${a.solid} border-transparent` : "border-slate-300 dark:border-slate-600"}`}>
                        <AnimatePresence>
                          {t.done && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                              <Check className="h-3 w-3 text-white" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-medium ${t.done ? "line-through text-slate-400" : ""}`}>{t.title}</span>
                        <PriorityBadge p={t.priority} />
                        {subj && <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${c.text}`}>{subj.name}</span>}
                        <span className="text-[10px] text-slate-400">{t.duration}m</span>
                      </div>
                      {t.notes && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">{t.notes}</p>}
                    </div>
                    <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                      <button onClick={() => { setEditing(t); setShowForm(true); }} className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-white/60 dark:hover:bg-white/10"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => removeTask(t.id)} className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-white/60 dark:hover:bg-white/10"><Trash2 className="h-3.5 w-3.5 text-rose-500" /></button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </GlassCard>

      <AnimatePresence>
        {showForm && (
          <TaskFormModal
            subjects={subjects}
            initial={editing}
            today={today}
            existingCount={dayTasks.length}
            onClose={() => { setShowForm(false); setEditing(null); }}
            onSave={saveTask}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const TaskFormModal: React.FC<{
  subjects: Subject[]; initial: Task | null; today: string; existingCount: number;
  onClose: () => void; onSave: (t: Task) => void;
}> = ({ subjects, initial, today, existingCount, onClose, onSave }) => {
  const { accent } = useContext(Ctx);
  const a = ACCENTS[accent];
  const [title, setTitle] = useState(initial?.title || "");
  const [subjectId, setSubjectId] = useState(initial?.subjectId || subjects[0]?.id || "");
  const [priority, setPriority] = useState<Priority>(initial?.priority || "medium");
  const [duration, setDuration] = useState(initial?.duration || 30);
  const [notes, setNotes] = useState(initial?.notes || "");

  return (
    <Modal onClose={onClose} title={initial ? "Edit Task" : "New Task"}>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Task title</label>
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Revise Newton's Laws" className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm outline-none focus:ring-2 focus:ring-offset-0 focus:ring-slate-300 dark:focus:ring-white/20" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Subject</label>
            <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm outline-none">
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm outline-none">
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Estimated duration (minutes)</label>
          <input type="number" min={5} step={5} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm outline-none" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Optional details..." className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm outline-none resize-none" />
        </div>
        <button
          disabled={!title.trim()}
          onClick={() => onSave({
            id: initial?.id || uid(), title: title.trim(), subjectId, priority, duration, notes,
            done: initial?.done || false, order: initial?.order ?? existingCount, createdAt: initial?.createdAt || new Date().toISOString(),
            completedAt: initial?.completedAt, date: today,
          })}
          className={`w-full py-2.5 rounded-xl ${a.solid} text-white text-sm font-medium disabled:opacity-40 hover:opacity-90 transition`}
        >
          {initial ? "Save Changes" : "Add Task"}
        </button>
      </div>
    </Modal>
  );
};

const Modal: React.FC<{ onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }> = ({ onClose, title, children, wide }) => (
  <motion.div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }}
      transition={{ duration: 0.2 }} onClick={(e) => e.stopPropagation()}
      className={`w-full ${wide ? "max-w-2xl" : "max-w-md"} rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl p-6 max-h-[85vh] overflow-y-auto`}
    >
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        <button onClick={onClose} className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10"><X className="h-4 w-4" /></button>
      </div>
      {children}
    </motion.div>
  </motion.div>
);

/* ============================== Quick Add / Search ============================== */

const QuickAddModal: React.FC<{ subjects: Subject[]; onClose: () => void; onAdd: (t: Task) => void; today: string; existingCount: number }> = ({ subjects, onClose, onAdd, today, existingCount }) => {
  const { accent } = useContext(Ctx);
  const a = ACCENTS[accent];
  const [title, setTitle] = useState("");
  return (
    <Modal onClose={onClose} title="Quick Add Task">
      <form onSubmit={(e) => { e.preventDefault(); if (!title.trim()) return; onAdd({ id: uid(), title: title.trim(), subjectId: subjects[0]?.id || "", priority: "medium", duration: 30, notes: "", done: false, order: existingCount, createdAt: new Date().toISOString(), date: today }); }}>
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What do you need to do?" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-white/20" />
        <button type="submit" className={`mt-3 w-full py-2.5 rounded-xl ${a.solid} text-white text-sm font-medium hover:opacity-90 transition`}>Add Task</button>
      </form>
    </Modal>
  );
};

const SearchModal: React.FC<{ search: string; setSearch: (s: string) => void; results: Task[]; subjects: Subject[]; onClose: () => void }> = ({ search, setSearch, results, subjects, onClose }) => (
  <Modal onClose={onClose} title="Search Tasks">
    <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title or notes..." className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-white/20" />
    <div className="mt-3 space-y-1 max-h-64 overflow-y-auto">
      {results.map((r) => {
        const subj = subjects.find((s) => s.id === r.subjectId);
        return (
          <div key={r.id} className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5">
            <span className="text-sm flex-1 truncate">{r.title}</span>
            {subj && <span className="text-[10px] text-slate-400">{subj.name}</span>}
          </div>
        );
      })}
      {search && results.length === 0 && <p className="text-xs text-slate-400 text-center py-6">No matching tasks found.</p>}
    </div>
  </Modal>
);

/* ============================== Subjects ============================== */

const SubjectsPanel: React.FC<{ subjects: Subject[]; setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>; tasks: Task[] }> = ({ subjects, setSubjects, tasks }) => {
  const { accent } = useContext(Ctx);
  const a = ACCENTS[accent];
  const [name, setName] = useState("");
  const [color, setColor] = useState("blue");

  const addSubject = () => {
    if (!name.trim()) return;
    setSubjects((prev) => [...prev, { id: uid(), name: name.trim(), color, custom: true }]);
    setName("");
  };

  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <SectionTitle icon={BookOpen} title="Subjects" subtitle="Organize tasks by subject with custom colors" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {subjects.map((s) => {
            const c = SUBJECT_COLORS[s.color];
            const count = tasks.filter((t) => t.subjectId === s.id).length;
            const doneCount = tasks.filter((t) => t.subjectId === s.id && t.done).length;
            return (
              <motion.div key={s.id} layout className={`p-4 rounded-2xl border ${c.border} ${c.bg} flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${c.dot}`} />
                  <div>
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{doneCount}/{count} tasks done</p>
                  </div>
                </div>
                {s.custom && (
                  <button onClick={() => setSubjects((prev) => prev.filter((x) => x.id !== s.id))} className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-white/60 dark:hover:bg-white/10">
                    <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 dark:border-white/10 pt-5">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New subject name" className="flex-1 min-w-[160px] px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm outline-none" />
          <div className="flex gap-1.5">
            {Object.keys(SUBJECT_COLORS).map((c) => (
              <button key={c} onClick={() => setColor(c)} className={`h-6 w-6 rounded-full ${SUBJECT_COLORS[c].dot} ${color === c ? "ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-900" : ""}`} />
            ))}
          </div>
          <button onClick={addSubject} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl ${a.solid} text-white text-xs font-medium hover:opacity-90 transition`}>
            <Plus className="h-3.5 w-3.5" /> Add Subject
          </button>
        </div>
      </GlassCard>
    </div>
  );
};

/* ============================== Focus Timer ============================== */

const FocusPanel: React.FC<{ pomodoroLen: number; breakLen: number; setPomodoroLen: (v: number) => void; setBreakLen: (v: number) => void; onSessionComplete: (mins: number) => void; notifOn: boolean }> = ({ pomodoroLen, breakLen, setPomodoroLen, setBreakLen, onSessionComplete, notifOn }) => {
  const { accent } = useContext(Ctx);
  const a = ACCENTS[accent];
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [secondsLeft, setSecondsLeft] = useState(pomodoroLen * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endTimeRef = useRef<number | null>(null); // epoch ms when current phase should end
  const modeRef = useRef(mode);
  const pomodoroLenRef = useRef(pomodoroLen);
  const breakLenRef = useRef(breakLen);
  modeRef.current = mode;
  pomodoroLenRef.current = pomodoroLen;
  breakLenRef.current = breakLen;

  useEffect(() => { if (!running) setSecondsLeft(mode === "focus" ? pomodoroLen * 60 : breakLen * 60); }, [pomodoroLen, breakLen, mode]);

  // Timestamp-based tick: recompute remaining time from real elapsed time each
  // tick instead of decrementing a counter. This avoids drift/slowdowns caused
  // by browsers (especially mobile) throttling setInterval when the tab or
  // screen isn't in the foreground.
  const tick = useCallback(() => {
    if (endTimeRef.current == null) return;
    const remainingMs = endTimeRef.current - Date.now();
    const remaining = Math.max(0, Math.ceil(remainingMs / 1000));

    if (remaining <= 0) {
      if (modeRef.current === "focus") {
        onSessionComplete(pomodoroLenRef.current);
        setSessions((n) => n + 1);
        if (notifOn && "Notification" in window && Notification.permission === "granted") {
          new Notification("Focus session complete!", { body: "Time for a well-earned break." });
        }
        setMode("break");
        endTimeRef.current = Date.now() + breakLenRef.current * 60 * 1000;
        setSecondsLeft(breakLenRef.current * 60);
      } else {
        setMode("focus");
        endTimeRef.current = Date.now() + pomodoroLenRef.current * 60 * 1000;
        setSecondsLeft(pomodoroLenRef.current * 60);
      }
    } else {
      setSecondsLeft(remaining);
    }
  }, [onSessionComplete, notifOn]);

  useEffect(() => {
    if (running) {
      if (endTimeRef.current == null) {
        endTimeRef.current = Date.now() + secondsLeft * 1000;
      }
      // Fire an immediate tick so the UI feels responsive the instant Start is
      // pressed, then continue on a 1s cadence. A short interval (250ms) is
      // used instead of exactly 1000ms so any single throttled/delayed tick
      // still self-corrects quickly using real elapsed time.
      tick();
      intervalRef.current = setInterval(tick, 250);
    } else {
      endTimeRef.current = null;
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, tick]);

  // Re-sync countdown if the page was backgrounded/suspended (common on
  // mobile) and resumes — recompute from the stored end time immediately.
  useEffect(() => {
    const onVisible = () => { if (running) tick(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [running, tick]);

  useEffect(() => {
    if (notifOn && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [notifOn]);

  const total = (mode === "focus" ? pomodoroLen : breakLen) * 60;
  const pct = 1 - secondsLeft / total;
  const mins = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const secs = (secondsLeft % 60).toString().padStart(2, "0");
  const r = 90;
  const c = 2 * Math.PI * r;

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <GlassCard className="p-8 lg:col-span-2 flex flex-col items-center justify-center gap-6">
        <div className="flex gap-2 mb-1">
          <span className={`text-xs font-medium px-3 py-1 rounded-full ${mode === "focus" ? `${a.solid} text-white` : "bg-slate-100 dark:bg-white/10 text-slate-500"}`}>Focus</span>
          <span className={`text-xs font-medium px-3 py-1 rounded-full ${mode === "break" ? "bg-emerald-500 text-white" : "bg-slate-100 dark:bg-white/10 text-slate-500"}`}>Break</span>
        </div>
        <div className="relative h-72 w-72">
          <svg viewBox="0 0 200 200" className="h-72 w-72 -rotate-90">
            <circle cx="100" cy="100" r={r} fill="none" strokeWidth="12" className="stroke-slate-100 dark:stroke-white/10" />
            <motion.circle
              cx="100" cy="100" r={r} fill="none" strokeWidth="12" strokeLinecap="round"
              className={mode === "focus" ? a.text.replace("text-", "stroke-") : "stroke-emerald-500"}
              strokeDasharray={c} animate={{ strokeDashoffset: c - pct * c }} transition={{ duration: 0.5, ease: "linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-5xl font-semibold tabular-nums">{mins}:{secs}</span>
            <span className="text-xs text-slate-400 mt-2">{mode === "focus" ? "Stay focused" : "Take a breather"}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setRunning((r2) => !r2)} className={`flex items-center gap-2 px-6 py-3 rounded-2xl ${a.solid} text-white font-medium shadow-md hover:opacity-90 transition`}>
            {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} {running ? "Pause" : "Start"}
          </button>
          <button onClick={() => { setRunning(false); setSecondsLeft(mode === "focus" ? pomodoroLen * 60 : breakLen * 60); }} className="flex items-center gap-2 px-5 py-3 rounded-2xl border border-slate-200 dark:border-white/10 font-medium hover:bg-slate-50 dark:hover:bg-white/5 transition">
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <SectionTitle icon={Timer} title="Session Info" />
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500 dark:text-slate-400">Sessions completed</span>
            <span className="text-lg font-semibold">{sessions}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500 dark:text-slate-400">Focus length</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPomodoroLen(Math.max(5, pomodoroLen - 5))}
                disabled={running}
                className="h-6 w-6 flex items-center justify-center rounded-full border border-slate-200 dark:border-white/10 text-xs disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-white/5 transition"
              >
                −
              </button>
              <input
                type="number"
                min={5}
                max={180}
                step={5}
                value={pomodoroLen}
                disabled={running}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isNaN(v)) setPomodoroLen(Math.min(180, Math.max(5, v)));
                }}
                className="w-14 text-center text-sm font-medium px-1 py-0.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 outline-none disabled:opacity-50"
              />
              <span className="text-sm font-medium">min</span>
              <button
                onClick={() => setPomodoroLen(Math.min(180, pomodoroLen + 5))}
                disabled={running}
                className="h-6 w-6 flex items-center justify-center rounded-full border border-slate-200 dark:border-white/10 text-xs disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-white/5 transition"
              >
                +
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500 dark:text-slate-400">Break length</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBreakLen(Math.max(1, breakLen - 1))}
                disabled={running}
                className="h-6 w-6 flex items-center justify-center rounded-full border border-slate-200 dark:border-white/10 text-xs disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-white/5 transition"
              >
                −
              </button>
              <span className="text-sm font-medium w-14 text-center">{breakLen} min</span>
              <button
                onClick={() => setBreakLen(Math.min(60, breakLen + 1))}
                disabled={running}
                className="h-6 w-6 flex items-center justify-center rounded-full border border-slate-200 dark:border-white/10 text-xs disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-white/5 transition"
              >
                +
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-white/10">Focus length can go up to 180 minutes. Pause or reset the timer to change it mid-session. A gentle notification will let you know when a session ends.</p>
        </div>
      </GlassCard>
    </div>
  );
};

/* ============================== Statistics ============================== */

const StatsPanel: React.FC<{ logs: DailyLog[]; tasks: Task[]; subjects: Subject[] }> = ({ logs, tasks, subjects }) => {
  const { accent, dark } = useContext(Ctx);
  const a = ACCENTS[accent];
  const today = todayStr();
  const todayLog = logs.find((l) => l.date === today);
  const completedTotal = tasks.filter((t) => t.done).length;
  const remaining = tasks.filter((t) => !t.done).length;
  const completionPct = tasks.length ? Math.round((completedTotal / tasks.length) * 100) : 0;

  const weekData = useMemo(() => {
    const arr = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const log = logs.find((l) => l.date === ds);
      arr.push({ day: d.toLocaleDateString(undefined, { weekday: "short" }), hours: log ? +(log.studyMinutes / 60).toFixed(1) : 0 });
    }
    return arr;
  }, [logs]);

  const monthData = useMemo(() => {
    const arr = [];
    for (let i = 29; i >= 0; i -= 3) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      let sum = 0;
      for (let j = 0; j < 3; j++) {
        const dd = new Date(d);
        dd.setDate(dd.getDate() + j);
        const dds = dd.toISOString().slice(0, 10);
        const l = logs.find((x) => x.date === dds);
        if (l) sum += l.studyMinutes;
      }
      arr.push({ day: d.toLocaleDateString(undefined, { day: "numeric", month: "short" }), hours: +(sum / 60).toFixed(1) });
    }
    return arr;
  }, [logs]);

  const subjectData = subjects.map((s) => ({ name: s.name, value: tasks.filter((t) => t.subjectId === s.id && t.done).length })).filter((s) => s.value > 0);
  const pieColors = ["#8b5cf6", "#3b82f6", "#10b981", "#f43f5e", "#f59e0b", "#06b6d4", "#ec4899"];

  const gridColor = dark ? "#ffffff1a" : "#e2e8f0";
  const textColor = dark ? "#94a3b8" : "#64748b";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Hours Today", value: `${((todayLog?.studyMinutes || 0) / 60).toFixed(1)}h` },
          { label: "Completed Tasks", value: completedTotal },
          { label: "Remaining Tasks", value: remaining },
          { label: "Completion Rate", value: `${completionPct}%` },
        ].map((s) => (
          <GlassCard key={s.label} className="p-5">
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{s.label}</p>
          </GlassCard>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <GlassCard className="p-6">
          <SectionTitle icon={BarChart3} title="Weekly Study Hours" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="day" stroke={textColor} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke={textColor} fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "none", fontSize: 12 }} />
                <Bar dataKey="hours" radius={[8, 8, 0, 0]} fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <SectionTitle icon={BarChart3} title="Monthly Study Hours" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="day" stroke={textColor} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={textColor} fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "none", fontSize: 12 }} />
                <Line type="monotone" dataKey="hours" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-6">
        <SectionTitle icon={BookOpen} title="Tasks Completed by Subject" />
        {subjectData.length === 0 ? <p className="text-sm text-slate-400 text-center py-10">Complete some tasks to see this breakdown.</p> : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={subjectData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={3}>
                  {subjectData.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "none", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </GlassCard>
    </div>
  );
};

/* ============================== Habits ============================== */

const HabitsPanel: React.FC<{ habits: Habit[]; setHabits: React.Dispatch<React.SetStateAction<Habit[]>>; today: string }> = ({ habits, setHabits, today }) => {
  const { accent } = useContext(Ctx);
  const a = ACCENTS[accent];
  const [name, setName] = useState("");

  const toggle = (id: string) => {
    setHabits((prev) => prev.map((h) => {
      if (h.id !== id) return h;
      const has = h.dates.includes(today);
      return { ...h, dates: has ? h.dates.filter((d) => d !== today) : [...h.dates, today] };
    }));
  };

  const streakFor = (h: Habit) => {
    let s = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      if (h.dates.includes(ds)) s++;
      else if (i === 0) continue;
      else break;
    }
    return s;
  };

  const addHabit = () => {
    if (!name.trim()) return;
    setHabits((prev) => [...prev, { id: uid(), name: name.trim(), icon: "book", custom: true, dates: [] }]);
    setName("");
  };

  return (
    <GlassCard className="p-6">
      <SectionTitle icon={Flame} title="Habit Tracker" subtitle="Build consistency, one day at a time" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {habits.map((h) => {
          const Icon = HABIT_ICONS[h.icon] || BookMarked;
          const done = h.dates.includes(today);
          const streak = streakFor(h);
          return (
            <motion.button key={h.id} onClick={() => toggle(h.id)} whileTap={{ scale: 0.97 }} className={`p-4 rounded-2xl border text-left transition ${done ? `${a.light} dark:bg-white/10 border-transparent` : "border-slate-200 dark:border-white/10"}`}>
              <div className="flex items-center justify-between mb-2">
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${done ? `${a.solid} text-white` : "bg-slate-100 dark:bg-white/10 text-slate-400"}`}>
                  <Icon className="h-4 w-4" />
                </div>
                {h.custom && (
                  <span onClick={(e) => { e.stopPropagation(); setHabits((prev) => prev.filter((x) => x.id !== h.id)); }} className="h-6 w-6 rounded-lg flex items-center justify-center hover:bg-white/60 dark:hover:bg-white/10">
                    <Trash2 className="h-3 w-3 text-rose-400" />
                  </span>
                )}
              </div>
              <p className="text-sm font-medium">{h.name}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1"><Flame className="h-3 w-3 text-orange-400" /> {streak} day streak</p>
            </motion.button>
          );
        })}
      </div>
      <div className="flex gap-2 border-t border-slate-100 dark:border-white/10 pt-5">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New habit name" className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm outline-none" />
        <button onClick={addHabit} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl ${a.solid} text-white text-xs font-medium hover:opacity-90 transition`}><Plus className="h-3.5 w-3.5" /> Add Habit</button>
      </div>
    </GlassCard>
  );
};

/* ============================== Calendar ============================== */

const CalendarPanel: React.FC<{ tasks: Task[]; logs: DailyLog[] }> = ({ tasks, logs }) => {
  const { accent } = useContext(Ctx);
  const a = ACCENTS[accent];
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState<string | null>(null);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (string | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }

  const dayInfo = (ds: string) => {
    const dayTasks = tasks.filter((t) => t.date === ds);
    const done = dayTasks.filter((t) => t.done).length;
    const log = logs.find((l) => l.date === ds);
    return { total: dayTasks.length, done, minutes: log?.studyMinutes || 0 };
  };

  const selectedTasks = selected ? tasks.filter((t) => t.date === selected) : [];

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <GlassCard className="p-6 lg:col-span-2">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold tracking-tight">{cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h2>
          <div className="flex gap-1">
            <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] text-slate-400 mb-2">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((ds, i) => {
            if (!ds) return <div key={i} />;
            const info = dayInfo(ds);
            const isToday = ds === todayStr();
            const productive = info.total > 0 && info.done === info.total;
            return (
              <button
                key={ds}
                onClick={() => setSelected(ds)}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 text-xs relative transition ${
                  selected === ds ? `${a.solid} text-white` : productive ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "hover:bg-slate-100 dark:hover:bg-white/5"
                } ${isToday && selected !== ds ? "ring-1 ring-offset-1 ring-slate-300 dark:ring-offset-slate-900" : ""}`}
              >
                <span className="font-medium">{ds.slice(-2).replace(/^0/, "")}</span>
                {info.total > 0 && <span className={`h-1 w-1 rounded-full ${selected === ds ? "bg-white" : productive ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`} />}
              </button>
            );
          })}
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <SectionTitle icon={CalendarDays} title={selected ? new Date(selected).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Select a day"} />
        {!selected ? (
          <p className="text-sm text-slate-400 text-center py-10">Click any day to view its tasks and progress.</p>
        ) : selectedTasks.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-10">No tasks recorded for this day.</p>
        ) : (
          <div className="space-y-2">
            {selectedTasks.map((t) => (
              <div key={t.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-white/5">
                {t.done ? <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> : <div className="h-3.5 w-3.5 rounded-full border border-slate-300 shrink-0" />}
                <span className={`text-sm truncate ${t.done ? "line-through text-slate-400" : ""}`}>{t.title}</span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
};

/* ============================== Notes ============================== */

const NotesPanel: React.FC<{ notes: NoteItem[]; setNotes: React.Dispatch<React.SetStateAction<NoteItem[]>> }> = ({ notes, setNotes }) => {
  const { accent } = useContext(Ctx);
  const a = ACCENTS[accent];
  const [activeId, setActiveId] = useState<string | null>(notes[0]?.id || null);
  const active = notes.find((n) => n.id === activeId);

  const createNote = () => {
    const n: NoteItem = { id: uid(), title: "Untitled note", content: "", checklist: [], updatedAt: new Date().toISOString() };
    setNotes((prev) => [n, ...prev]);
    setActiveId(n.id);
  };

  const update = (patch: Partial<NoteItem>) => {
    if (!active) return;
    setNotes((prev) => prev.map((n) => (n.id === active.id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n)));
  };

  const addChecklistItem = () => {
    if (!active) return;
    update({ checklist: [...active.checklist, { id: uid(), text: "", done: false }] });
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <GlassCard className="p-4 lg:col-span-1">
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-semibold">All Notes</h3>
          <button onClick={createNote} className={`h-7 w-7 rounded-lg flex items-center justify-center ${a.solid} text-white`}><Plus className="h-3.5 w-3.5" /></button>
        </div>
        <div className="space-y-1 max-h-[60vh] overflow-y-auto">
          {notes.map((n) => (
            <button key={n.id} onClick={() => setActiveId(n.id)} className={`w-full text-left p-3 rounded-xl transition ${activeId === n.id ? `${a.light} dark:bg-white/10` : "hover:bg-slate-50 dark:hover:bg-white/5"}`}>
              <p className="text-sm font-medium truncate">{n.title || "Untitled note"}</p>
              <p className="text-[11px] text-slate-400 truncate">{n.content || (n.checklist.length ? `${n.checklist.length} checklist items` : "No content")}</p>
            </button>
          ))}
          {notes.length === 0 && <p className="text-xs text-slate-400 text-center py-8">No notes yet.</p>}
        </div>
      </GlassCard>

      <GlassCard className="p-6 lg:col-span-2">
        {!active ? (
          <p className="text-sm text-slate-400 text-center py-16">Select or create a note to get started.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <input value={active.title} onChange={(e) => update({ title: e.target.value })} className="text-lg font-semibold tracking-tight bg-transparent outline-none flex-1" placeholder="Note title" />
              <button onClick={() => { setNotes((prev) => prev.filter((n) => n.id !== active.id)); setActiveId(null); }} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10"><Trash2 className="h-4 w-4 text-rose-500" /></button>
            </div>
            <textarea value={active.content} onChange={(e) => update({ content: e.target.value })} rows={6} placeholder="Write your thoughts, bullet points, or plans..." className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm outline-none resize-none" />
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Checklist</span>
                <button onClick={addChecklistItem} className="text-xs text-slate-500 dark:text-slate-400 hover:underline flex items-center gap-1"><Plus className="h-3 w-3" /> Add item</button>
              </div>
              <div className="space-y-1.5">
                {active.checklist.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <button onClick={() => update({ checklist: active.checklist.map((c) => (c.id === item.id ? { ...c, done: !c.done } : c)) })} className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 ${item.done ? `${a.solid} border-transparent` : "border-slate-300 dark:border-slate-600"}`}>
                      {item.done && <Check className="h-2.5 w-2.5 text-white" />}
                    </button>
                    <input value={item.text} onChange={(e) => update({ checklist: active.checklist.map((c) => (c.id === item.id ? { ...c, text: e.target.value } : c)) })} className={`flex-1 bg-transparent text-sm outline-none ${item.done ? "line-through text-slate-400" : ""}`} placeholder="List item" />
                    <button onClick={() => update({ checklist: active.checklist.filter((c) => c.id !== item.id) })}><X className="h-3.5 w-3.5 text-slate-300 hover:text-rose-500" /></button>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-slate-400">Autosaved {new Date(active.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
          </div>
        )}
      </GlassCard>
    </div>
  );
};

/* ============================== Goals ============================== */

const GoalsPanel: React.FC<{ goals: Goal[]; setGoals: React.Dispatch<React.SetStateAction<Goal[]>> }> = ({ goals, setGoals }) => {
  const { accent } = useContext(Ctx);
  const a = ACCENTS[accent];
  const [text, setText] = useState("");
  const [period, setPeriod] = useState<Goal["period"]>("daily");

  const add = () => {
    if (!text.trim()) return;
    setGoals((prev) => [...prev, { id: uid(), text: text.trim(), period, done: false, createdAt: new Date().toISOString() }]);
    setText("");
  };

  const sections: { key: Goal["period"]; label: string }[] = [
    { key: "daily", label: "Daily Goals" }, { key: "weekly", label: "Weekly Goals" }, { key: "monthly", label: "Monthly Goals" },
  ];

  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <SectionTitle icon={Target} title="Goals" subtitle="Set and track intentions across time horizons" />
        <div className="flex flex-wrap gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Finish 3 chapters of Chemistry" className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm outline-none" />
          <select value={period} onChange={(e) => setPeriod(e.target.value as Goal["period"])} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm outline-none">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <button onClick={add} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl ${a.solid} text-white text-xs font-medium hover:opacity-90 transition`}><Plus className="h-3.5 w-3.5" /> Add Goal</button>
        </div>
      </GlassCard>

      <div className="grid lg:grid-cols-3 gap-6">
        {sections.map((sec) => {
          const list = goals.filter((g) => g.period === sec.key);
          const done = list.filter((g) => g.done).length;
          const pct = list.length ? Math.round((done / list.length) * 100) : 0;
          return (
            <GlassCard key={sec.key} className="p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">{sec.label}</h3>
                <span className="text-xs text-slate-400">{done}/{list.length}</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden mb-4">
                <motion.div className={`h-full rounded-full ${a.solid}`} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} />
              </div>
              <div className="space-y-2">
                {list.map((g) => (
                  <div key={g.id} className="flex items-center gap-2 group">
                    <button onClick={() => setGoals((prev) => prev.map((x) => (x.id === g.id ? { ...x, done: !x.done } : x)))} className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 ${g.done ? `${a.solid} border-transparent` : "border-slate-300 dark:border-slate-600"}`}>
                      {g.done && <Check className="h-2.5 w-2.5 text-white" />}
                    </button>
                    <span className={`text-sm flex-1 truncate ${g.done ? "line-through text-slate-400" : ""}`}>{g.text}</span>
                    <button onClick={() => setGoals((prev) => prev.filter((x) => x.id !== g.id))} className="opacity-0 group-hover:opacity-100 transition"><X className="h-3.5 w-3.5 text-slate-300 hover:text-rose-500" /></button>
                  </div>
                ))}
                {list.length === 0 && <p className="text-xs text-slate-400">No {sec.key} goals yet.</p>}
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
};

/* ============================== Exams ============================== */

const ExamsPanel: React.FC<{ exams: Exam[]; setExams: React.Dispatch<React.SetStateAction<Exam[]>>; subjects: Subject[] }> = ({ exams, setExams, subjects }) => {
  const { accent } = useContext(Ctx);
  const a = ACCENTS[accent];
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || "");
  const [date, setDate] = useState("");

  const daysLeft = (d: string) => Math.ceil((new Date(d).getTime() - new Date(todayStr()).getTime()) / 86400000);

  const add = () => {
    if (!name.trim() || !date) return;
    setExams((prev) => [...prev, { id: uid(), name: name.trim(), subjectId, date }]);
    setName(""); setDate(""); setShowForm(false);
  };

  const sorted = [...exams].sort((x, y) => x.date.localeCompare(y.date));

  return (
    <GlassCard className="p-6">
      <SectionTitle icon={GraduationCap} title="Exam Countdown" subtitle="Stay ahead of every deadline" right={
        <button onClick={() => setShowForm(true)} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl ${a.solid} text-white text-xs font-medium hover:opacity-90 transition`}><Plus className="h-3.5 w-3.5" /> Add Exam</button>
      } />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sorted.map((e) => {
          const subj = subjects.find((s) => s.id === e.subjectId);
          const c = subj ? SUBJECT_COLORS[subj.color] : SUBJECT_COLORS.slate;
          const dl = daysLeft(e.date);
          const urgent = dl <= 3;
          const soon = dl <= 7 && !urgent;
          return (
            <motion.div key={e.id} layout className={`p-4 rounded-2xl border ${urgent ? "border-rose-300 bg-rose-50 dark:bg-rose-500/10 dark:border-rose-500/30" : soon ? "border-amber-300 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30" : `${c.border} ${c.bg}`}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${c.text}`}>{subj?.name}</span>
                <button onClick={() => setExams((prev) => prev.filter((x) => x.id !== e.id))}><X className="h-3.5 w-3.5 text-slate-300 hover:text-rose-500" /></button>
              </div>
              <p className="text-sm font-medium mb-2">{e.name}</p>
              <div className="flex items-end justify-between">
                <span className={`text-2xl font-bold tabular-nums ${urgent ? "text-rose-600 dark:text-rose-400" : soon ? "text-amber-600 dark:text-amber-400" : ""}`}>{dl >= 0 ? dl : 0}</span>
                <span className="text-xs text-slate-400">{dl >= 0 ? "days left" : "past"}</span>
              </div>
            </motion.div>
          );
        })}
        {sorted.length === 0 && <p className="text-sm text-slate-400 col-span-full text-center py-8">No upcoming exams. Add one to start your countdown.</p>}
      </div>

      <AnimatePresence>
        {showForm && (
          <Modal onClose={() => setShowForm(false)} title="New Exam">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Exam name</label>
                <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Physics Mid-term" className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Subject</label>
                  <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm outline-none">
                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Date</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm outline-none" />
                </div>
              </div>
              <button onClick={add} className={`w-full py-2.5 rounded-xl ${a.solid} text-white text-sm font-medium hover:opacity-90 transition`}>Add Exam</button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </GlassCard>
  );
};

/* ============================== Achievements ============================== */

const ACH_ICONS: Record<string, React.ElementType> = { check: Check, timer: Timer, flame: Flame, star: Star, award: Award };

const AchievementsPanel: React.FC<{ achievements: Achievement[] }> = ({ achievements }) => {
  const { accent } = useContext(Ctx);
  const a = ACCENTS[accent];
  return (
    <GlassCard className="p-6">
      <SectionTitle icon={Trophy} title="Achievements" subtitle={`${achievements.filter((a2) => a2.unlocked).length}/${achievements.length} unlocked`} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {achievements.map((ach) => {
          const Icon = ACH_ICONS[ach.icon] || Award;
          return (
            <motion.div key={ach.id} whileHover={{ y: -2 }} className={`p-5 rounded-2xl border text-center ${ach.unlocked ? `${a.light} dark:bg-white/10 border-transparent` : "border-slate-200 dark:border-white/10 opacity-60"}`}>
              <div className={`h-12 w-12 rounded-2xl mx-auto flex items-center justify-center mb-3 ${ach.unlocked ? `bg-gradient-to-br ${a.from} ${a.to} text-white` : "bg-slate-100 dark:bg-white/10 text-slate-400"}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold">{ach.title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{ach.desc}</p>
              {ach.unlocked && ach.unlockedAt && <p className="text-[10px] text-slate-400 mt-2">Unlocked {ach.unlockedAt}</p>}
            </motion.div>
          );
        })}
      </div>
    </GlassCard>
  );
};

/* ============================== Daily Review ============================== */

const ReviewPanel: React.FC<{
  tasks: Task[]; completedToday: number; todayLog: DailyLog; achievements: Achievement[];
  reflections: Reflection[]; setReflections: React.Dispatch<React.SetStateAction<Reflection[]>>; today: string;
}> = ({ tasks, completedToday, todayLog, achievements, reflections, setReflections, today }) => {
  const { accent } = useContext(Ctx);
  const a = ACCENTS[accent];
  const existing = reflections.find((r) => r.date === today);
  const [reflection, setReflection] = useState(existing?.reflection || "");
  const [plan, setPlan] = useState(existing?.planTomorrow || "");
  const biggest = [...achievements].filter((a2) => a2.unlocked).sort((x, y) => (y.unlockedAt || "").localeCompare(x.unlockedAt || ""))[0];

  const save = () => {
    setReflections((prev) => {
      const idx = prev.findIndex((r) => r.date === today);
      const entry = { date: today, reflection, planTomorrow: plan };
      if (idx === -1) return [...prev, entry];
      const copy = [...prev]; copy[idx] = entry; return copy;
    });
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <GlassCard className="p-6">
        <SectionTitle icon={ClipboardList} title="Today's Summary" />
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5">
            <p className="text-2xl font-bold">{completedToday}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Tasks completed</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5">
            <p className="text-2xl font-bold">{tasks.length - completedToday}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Tasks remaining</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5">
            <p className="text-2xl font-bold">{(todayLog.studyMinutes / 60).toFixed(1)}h</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Hours studied</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5">
            <p className="text-sm font-semibold truncate">{biggest ? biggest.title : "None yet"}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Biggest achievement</p>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <SectionTitle icon={Pencil} title="Reflection" />
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">How did today go?</label>
            <textarea value={reflection} onChange={(e) => setReflection(e.target.value)} rows={4} placeholder="Reflect on what worked and what didn't..." className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm outline-none resize-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Plan for tomorrow</label>
            <textarea value={plan} onChange={(e) => setPlan(e.target.value)} rows={3} placeholder="What will you focus on tomorrow?" className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm outline-none resize-none" />
          </div>
          <button onClick={save} className={`w-full py-2.5 rounded-xl ${a.solid} text-white text-sm font-medium hover:opacity-90 transition`}>Save Reflection</button>
        </div>
      </GlassCard>
    </div>
  );
};

/* ============================== Settings ============================== */

const SettingsPanel: React.FC<{
  dark: boolean; setDark: (v: boolean | ((p: boolean) => boolean)) => void;
  accent: string; setAccent: (v: string) => void;
  pomodoroLen: number; setPomodoroLen: (v: number) => void;
  breakLen: number; setBreakLen: (v: number) => void;
  notifOn: boolean; setNotifOn: (v: boolean) => void;
  onExport: () => void; onImport: (f: File) => void; onReset: () => void;
}> = ({ dark, setDark, accent, setAccent, pomodoroLen, setPomodoroLen, breakLen, setBreakLen, notifOn, setNotifOn, onExport, onImport, onReset }) => {
  const a = ACCENTS[accent];
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-6 max-w-2xl">
      <GlassCard className="p-6">
        <SectionTitle icon={SettingsIcon} title="Appearance" />
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium">Theme</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Switch between light and dark mode</p>
          </div>
          <button onClick={() => setDark((d) => !d)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 dark:border-white/10 text-xs`}>
            {dark ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />} {dark ? "Dark" : "Light"}
          </button>
        </div>
        <div className="py-3 border-t border-slate-100 dark:border-white/10">
          <p className="text-sm font-medium mb-2">Accent color</p>
          <div className="flex gap-2">
            {Object.entries(ACCENTS).map(([key, val]) => (
              <button key={key} onClick={() => setAccent(key)} className={`h-9 w-9 rounded-full ${val.solid} ${accent === key ? "ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-900" : ""}`} title={val.name} />
            ))}
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <SectionTitle icon={Timer} title="Focus Timer" />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Pomodoro length (min)</label>
            <input type="number" min={5} max={180} value={pomodoroLen} onChange={(e) => setPomodoroLen(Number(e.target.value))} className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Break length (min)</label>
            <input type="number" min={1} max={30} value={breakLen} onChange={(e) => setBreakLen(Number(e.target.value))} className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm outline-none" />
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <SectionTitle icon={Bell} title="Notifications" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Session & reminder alerts</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Break reminders, exam warnings, and daily planning nudges</p>
          </div>
          <button onClick={() => setNotifOn(!notifOn)} className={`h-6 w-11 rounded-full transition relative ${notifOn ? a.solid : "bg-slate-200 dark:bg-white/10"}`}>
            <motion.span className="absolute top-1 h-4 w-4 rounded-full bg-white shadow" animate={{ left: notifOn ? 24 : 4 }} transition={{ duration: 0.2 }} />
          </button>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <SectionTitle icon={Download} title="Data Management" subtitle="Everything is stored locally in your browser" />
        <div className="flex flex-wrap gap-3">
          <button onClick={onExport} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-sm hover:bg-slate-50 dark:hover:bg-white/5 transition"><Download className="h-4 w-4" /> Export Data</button>
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-sm hover:bg-slate-50 dark:hover:bg-white/5 transition"><Upload className="h-4 w-4" /> Import Data</button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); }} />
          <button onClick={onReset} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-500/30 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition ml-auto"><Trash2 className="h-4 w-4" /> Reset All Data</button>
        </div>
      </GlassCard>

      <p className="text-xs text-slate-400 text-center">StudyFlow — a calm, focused space to get things done. Keyboard shortcuts: ⌘K search, ⌘N quick add.</p>
    </div>
  );
};
