"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  BookOpen,
  Brain,
  Coffee,
  Droplets,
  Dumbbell,
  Footprints,
  HeartPulse,
  Leaf,
  Moon,
  Music2,
  Pencil,
  Sun,
  Sunrise,
  type LucideIcon,
} from "lucide-react";

/* ---------- Tipe dasar ---------- */

export type Category = "pagi" | "siang" | "malam" | "bebas";

export type Habit = {
  id: string;
  icon: string;
  name: string;
  category: Category;
  target: number;
  createdAt: string;
  history: Record<string, number>;
};

export const CATEGORY_META: Record<
  Category,
  { label: string; icon: LucideIcon; chip: string; flower: string }
> = {
  pagi: {
    label: "Pagi",
    icon: Sunrise,
    chip: "bg-amber-100 text-amber-700",
    flower: "#FBBF24",
  },
  siang: {
    label: "Siang",
    icon: Sun,
    chip: "bg-yellow-100 text-yellow-700",
    flower: "#FACC15",
  },
  malam: {
    label: "Malam",
    icon: Moon,
    chip: "bg-rose-100 text-rose-600",
    flower: "#FB7185",
  },
  bebas: {
    label: "Bebas",
    icon: Leaf,
    chip: "bg-teal-100 text-teal-600",
    flower: "#2DD4BF",
  },
};

export const HABIT_ICONS: Record<string, LucideIcon> = {
  Droplets,
  BookOpen,
  Footprints,
  Pencil,
  Moon,
  Sun,
  Dumbbell,
  Brain,
  Coffee,
  Music2,
  HeartPulse,
  Sunrise,
};

export function HabitIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Ico = HABIT_ICONS[name] ?? Leaf;
  return <Ico className={className} aria-hidden />;
}

/* ---------- Tanggal ---------- */

export const DAY_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayKey(): string {
  return dateKey(new Date());
}

export function shiftKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  dt.setDate(dt.getDate() + days);
  return dateKey(dt);
}

export function weekdayOf(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1).getDay();
}

export function shortDate(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
  }).format(new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1));
}

/* ---------- Hitung-hitungan kebiasaan ---------- */

export function countOn(h: Habit, key: string): number {
  return h.history[key] ?? 0;
}

export function isDone(h: Habit, key: string): boolean {
  return countOn(h, key) >= h.target;
}

export function existedOn(h: Habit, key: string): boolean {
  return h.createdAt <= key;
}

/** Runtun hari berturut-turut; hari ini yang belum tuntas tidak memutus. */
export function streakOf(h: Habit): number {
  let s = 0;
  let k = todayKey();
  if (!isDone(h, k)) k = shiftKey(k, -1);
  while (isDone(h, k)) {
    s += 1;
    k = shiftKey(k, -1);
  }
  return s;
}

export function bestStreakOf(h: Habit): number {
  const keys = Object.keys(h.history).sort();
  if (keys.length === 0) return 0;
  let best = 0;
  let run = 0;
  let k = keys[0] ?? "";
  const end = todayKey();
  while (k <= end) {
    if (isDone(h, k)) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 0;
    }
    k = shiftKey(k, 1);
  }
  return best;
}

export function doneDaysOf(h: Habit): number {
  return Object.values(h.history).filter((c) => c >= h.target).length;
}

/** Tahap tanaman dari runtun: 2 hari tunas, 5 tumbuh, 10 mekar. */
export function plantStage(streak: number): 0 | 1 | 2 | 3 {
  if (streak >= 10) return 3;
  if (streak >= 5) return 2;
  if (streak >= 2) return 1;
  return 0;
}

export const STAGE_LABEL = ["Biji", "Tunas", "Tumbuh", "Mekar"];
export const NEXT_STAGE_AT = [2, 5, 10];

export function ratioOn(habits: Habit[], key: string): number {
  const live = habits.filter((h) => existedOn(h, key));
  if (live.length === 0) return 0;
  return live.filter((h) => isDone(h, key)).length / live.length;
}

/* ---------- Usulan & kutipan ---------- */

export type HabitDraft = Omit<Habit, "id" | "createdAt" | "history">;

export const SUGGESTIONS: HabitDraft[] = [
  { icon: "Droplets", name: "Minum air 8 gelas", category: "pagi", target: 3 },
  { icon: "BookOpen", name: "Membaca 10 halaman", category: "malam", target: 1 },
  { icon: "Dumbbell", name: "Olahraga ringan", category: "pagi", target: 1 },
  { icon: "Brain", name: "Meditasi 10 menit", category: "pagi", target: 1 },
  { icon: "Pencil", name: "Menulis jurnal", category: "malam", target: 1 },
  { icon: "Footprints", name: "Jalan kaki 20 menit", category: "siang", target: 1 },
];

export const QUOTES = [
  "Kebiasaan kecil yang dirawat hari ini akan menjadi naungan esok hari.",
  "Satu biji, satu siraman, satu langkah — itu cukup untuk hari ini.",
  "Taman tak tumbuh dalam semalam, tapi tiap hari ia menambah sehelai daun.",
  "Mulai dari yang terkecil, biarkan konsistensi yang menyiramnya.",
  "Hari ini adalah pupuk terbaik untuk rutinitasmu besok.",
];

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `h-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function makeHabit(draft: HabitDraft): Habit {
  return { ...draft, id: newId(), createdAt: todayKey(), history: {} };
}

/* ---------- Penyimpanan & konteks ---------- */

const STORAGE_KEY = "rutina-kebun-v1";

type RutinaContextValue = {
  ready: boolean;
  habits: Habit[];
  addHabit: (h: Habit) => void;
  updateHabit: (id: string, patch: Partial<Omit<Habit, "id">>) => void;
  removeHabit: (id: string) => void;
  setTodayCount: (id: string, n: number) => void;
  incrementToday: (id: string) => void;
};

const RutinaContext = createContext<RutinaContextValue | null>(null);

export function RutinaProvider({ children }: { children: ReactNode }) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (Array.isArray(parsed)) setHabits(parsed as Habit[]);
        }
      } catch {
        /* data rusak dibiarkan, mulai dari kebun kosong */
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
    } catch {
      /* penyimpanan penuh — abaikan */
    }
  }, [habits, ready]);

  const addHabit = useCallback((h: Habit) => {
    setHabits((prev) => [...prev, h]);
  }, []);

  const updateHabit = useCallback(
    (id: string, patch: Partial<Omit<Habit, "id">>) => {
      setHabits((prev) =>
        prev.map((h) => (h.id === id ? { ...h, ...patch } : h))
      );
    },
    []
  );

  const removeHabit = useCallback((id: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const setTodayCount = useCallback((id: string, n: number) => {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        const k = todayKey();
        const history = { ...h.history };
        if (n <= 0) delete history[k];
        else history[k] = Math.min(h.target, n);
        return { ...h, history };
      })
    );
  }, []);

  const incrementToday = useCallback((id: string) => {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        const k = todayKey();
        const next = Math.min(h.target, (h.history[k] ?? 0) + 1);
        return { ...h, history: { ...h.history, [k]: next } };
      })
    );
  }, []);

  const value = useMemo(
    () => ({
      ready,
      habits,
      addHabit,
      updateHabit,
      removeHabit,
      setTodayCount,
      incrementToday,
    }),
    [
      ready,
      habits,
      addHabit,
      updateHabit,
      removeHabit,
      setTodayCount,
      incrementToday,
    ]
  );

  return (
    <RutinaContext.Provider value={value}>{children}</RutinaContext.Provider>
  );
}

export function useRutina(): RutinaContextValue {
  const ctx = useContext(RutinaContext);
  if (!ctx) throw new Error("useRutina harus dipakai di dalam RutinaProvider");
  return ctx;
}
