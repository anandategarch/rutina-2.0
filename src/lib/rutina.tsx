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
  /** Hari aktif dalam seminggu (0=Minggu … 6=Sabtu). */
  schedule: number[];
  /** Waktu pengingat "HH:MM", atau null bila tidak ada. */
  reminder: string | null;
};

export const DEFAULT_SCHEDULE = [0, 1, 2, 3, 4, 5, 6];

export const CATEGORY_META: Record<
  Category,
  { label: string; icon: LucideIcon; chip: string; flower: string }
> = {
  pagi: {
    label: "Pagi",
    icon: Sunrise,
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    flower: "#FBBF24",
  },
  siang: {
    label: "Siang",
    icon: Sun,
    chip: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-300",
    flower: "#FACC15",
  },
  malam: {
    label: "Malam",
    icon: Moon,
    chip: "bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300",
    flower: "#FB7185",
  },
  bebas: {
    label: "Bebas",
    icon: Leaf,
    chip: "bg-teal-100 text-teal-600 dark:bg-teal-500/10 dark:text-teal-300",
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

/** Waktu sekarang "HH:MM" untuk pencocokan pengingat. */
export function hhmmNow(): string {
  const d = new Date();
  return `${`${d.getHours()}`.padStart(2, "0")}:${`${d.getMinutes()}`.padStart(2, "0")}`;
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

/** Terjadwal pada tanggal itu: sudah ada DAN harinya aktif. */
export function scheduledOn(h: Habit, key: string): boolean {
  return existedOn(h, key) && h.schedule.includes(weekdayOf(key));
}

/** Runtun hari terjadwal berturut-turut; hari tidak terjadwal dilompati. */
export function streakOf(h: Habit): number {
  let s = 0;
  let k = todayKey();
  if (!isDone(h, k)) k = shiftKey(k, -1);
  let guard = 0;
  while (guard < 400) {
    if (!existedOn(h, k)) break;
    if (h.schedule.includes(weekdayOf(k))) {
      if (isDone(h, k)) s += 1;
      else break;
    }
    k = shiftKey(k, -1);
    guard += 1;
  }
  return s;
}

export function bestStreakOf(h: Habit): number {
  const keys = Object.keys(h.history).sort();
  if (keys.length === 0) return 0;
  let best = 0;
  let run = 0;
  let k = h.createdAt < (keys[0] ?? "") ? h.createdAt : (keys[0] ?? "");
  const end = todayKey();
  let guard = 0;
  while (k <= end && guard < 400) {
    if (h.schedule.includes(weekdayOf(k))) {
      if (isDone(h, k)) {
        run += 1;
        if (run > best) best = run;
      } else {
        run = 0;
      }
    }
    k = shiftKey(k, 1);
    guard += 1;
  }
  return best;
}

export function doneDaysOf(h: Habit): number {
  return Object.values(h.history).filter((c) => c >= h.target).length;
}

/**
 * Skor kekuatan kebiasaan ala Loop: tingkat kepatuhan berbobot 28 hari
 * terjadwal terakhir — hari terbaru berbobot lebih besar, jadi beberapa
 * hari terlewat tak serta-merta meruntuhkan progres panjang.
 */
export function habitScore(h: Habit): number | null {
  const end = todayKey();
  const days: string[] = [];
  let k = h.createdAt;
  let guard = 0;
  while (k <= end && guard < 400) {
    if (h.schedule.includes(weekdayOf(k))) days.push(k);
    k = shiftKey(k, 1);
    guard += 1;
  }
  if (days.length === 0) return null;
  const recent = days.slice(-28);
  let num = 0;
  let den = 0;
  recent.forEach((key, i) => {
    const w = i + 1;
    den += w;
    if (isDone(h, key)) num += w;
  });
  return Math.round((num / den) * 100);
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

/** Rasio tuntas dari kebiasaan yang terjadwal pada tanggal itu. */
export function ratioOn(habits: Habit[], key: string): number {
  const live = habits.filter((h) => scheduledOn(h, key));
  if (live.length === 0) return 0;
  return live.filter((h) => isDone(h, key)).length / live.length;
}

/* ---------- Usulan & kutipan ---------- */

export type HabitDraft = Omit<Habit, "id" | "createdAt" | "history">;

export const SUGGESTIONS: HabitDraft[] = [
  {
    icon: "Droplets",
    name: "Minum air 8 gelas",
    category: "pagi",
    target: 3,
    schedule: DEFAULT_SCHEDULE,
    reminder: null,
  },
  {
    icon: "BookOpen",
    name: "Membaca 10 halaman",
    category: "malam",
    target: 1,
    schedule: DEFAULT_SCHEDULE,
    reminder: "20:30",
  },
  {
    icon: "Dumbbell",
    name: "Olahraga ringan",
    category: "pagi",
    target: 1,
    schedule: [1, 3, 5],
    reminder: "06:30",
  },
  {
    icon: "Brain",
    name: "Meditasi 10 menit",
    category: "pagi",
    target: 1,
    schedule: DEFAULT_SCHEDULE,
    reminder: null,
  },
  {
    icon: "Pencil",
    name: "Menulis jurnal",
    category: "malam",
    target: 1,
    schedule: DEFAULT_SCHEDULE,
    reminder: "21:00",
  },
  {
    icon: "Footprints",
    name: "Jalan kaki 20 menit",
    category: "siang",
    target: 1,
    schedule: [1, 2, 3, 4, 5],
    reminder: null,
  },
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
  return {
    ...draft,
    schedule: draft.schedule.length > 0 ? draft.schedule : DEFAULT_SCHEDULE,
    id: newId(),
    createdAt: todayKey(),
    history: {},
  };
}

/* ---------- Penyimpanan & konteks ---------- */

const STORAGE_KEY = "rutina-kebun-v1";

/** Isi bidang baru (schedule/reminder) pada data lama. */
function migrate(h: Habit): Habit {
  return {
    ...h,
    schedule:
      Array.isArray(h.schedule) && h.schedule.length > 0
        ? h.schedule
        : DEFAULT_SCHEDULE,
    reminder: typeof h.reminder === "string" ? h.reminder : null,
  };
}

type RutinaContextValue = {
  ready: boolean;
  habits: Habit[];
  addHabit: (h: Habit) => void;
  updateHabit: (id: string, patch: Partial<Omit<Habit, "id">>) => void;
  removeHabit: (id: string) => void;
  resetAll: () => void;
  setTodayCount: (id: string, n: number) => void;
  setCountOn: (id: string, key: string, n: number) => void;
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
          if (Array.isArray(parsed)) {
            setHabits((parsed as Habit[]).map(migrate));
          }
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

  const resetAll = useCallback(() => {
    setHabits([]);
  }, []);

  const setCountOn = useCallback((id: string, key: string, n: number) => {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        const history = { ...h.history };
        if (n <= 0) delete history[key];
        else history[key] = Math.min(h.target, n);
        return { ...h, history };
      })
    );
  }, []);

  const setTodayCount = useCallback(
    (id: string, n: number) => {
      setCountOn(id, todayKey(), n);
    },
    [setCountOn]
  );

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
      resetAll,
      setTodayCount,
      setCountOn,
      incrementToday,
    }),
    [
      ready,
      habits,
      addHabit,
      updateHabit,
      removeHabit,
      resetAll,
      setTodayCount,
      setCountOn,
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
