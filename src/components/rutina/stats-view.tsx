"use client";

import { useEffect, useMemo, useRef } from "react";
import { animate, stagger } from "animejs";
import { motion, type Variants } from "motion/react";
import {
  CalendarRange,
  CheckCircle2,
  Flame,
  Plus,
  Sprout,
  Droplets,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import {
  DAY_SHORT,
  bestStreakOf,
  doneDaysOf,
  existedOn,
  isDone,
  ratioOn,
  shiftKey,
  shortDate,
  streakOf,
  todayKey,
  useRutina,
  weekdayOf,
  type Habit,
} from "@/lib/rutina";
import { cn } from "@/lib/utils";
import { IconChip, SpringNumber } from "./bits";

const HEAT_COLS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

function heatClass(ratio: number, future: boolean): string {
  if (future) return "border border-dashed border-stone-300 bg-transparent";
  if (ratio <= 0) return "bg-stone-200/80";
  if (ratio < 0.5) return "bg-emerald-200";
  if (ratio < 1) return "bg-emerald-400";
  return "bg-emerald-500";
}

/* ---------- Peta panas 5 minggu ---------- */

function Heatmap({
  cells,
}: {
  cells: { key: string; ratio: number; future: boolean }[];
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const grid = ref.current;
    if (!grid) return;
    const cells = grid.querySelectorAll<HTMLElement>(".hm-cell");
    if (cells.length === 0) return;
    const anim = animate(cells, {
      opacity: [0, 1],
      scale: [0.4, 1],
      duration: 480,
      ease: "outBack(1.6)",
      delay: stagger(14, { grid: [7, 5], from: "center" }),
    });
    return () => {
      anim.revert();
    };
  }, []);

  return (
    <div>
      <div className="mb-1.5 grid grid-cols-7 gap-1.5">
        {HEAT_COLS.map((l) => (
          <span
            key={l}
            className="text-center text-[10px] font-medium text-stone-400"
          >
            {l}
          </span>
        ))}
      </div>
      <div ref={ref} className="grid grid-cols-7 gap-1.5">
        {cells.map((c) => (
          <span
            key={c.key}
            title={`${shortDate(c.key)} · ${c.future ? "belum terjadi" : `${Math.round(c.ratio * 100)}%`}`}
            className={cn(
              "hm-cell aspect-square rounded-[5px] will-change-transform",
              heatClass(c.ratio, c.future)
            )}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px] text-stone-400">
        <span>5 minggu terakhir</span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[4px] bg-stone-200/80" />
          <span className="size-2.5 rounded-[4px] bg-emerald-200" />
          <span className="size-2.5 rounded-[4px] bg-emerald-400" />
          <span className="size-2.5 rounded-[4px] bg-emerald-500" />
        </span>
      </div>
    </div>
  );
}

/* ---------- Kartu statistik besar ---------- */

function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
}: {
  icon: typeof Flame;
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <Card className="gap-0 rounded-3xl border-amber-100 py-0">
      <CardContent className="px-5 py-5">
        <span className="grid size-9 place-items-center rounded-xl bg-amber-100 text-amber-700">
          <Icon className="size-4.5" aria-hidden />
        </span>
        <p className="mt-3">
          <SpringNumber
            value={value}
            className="text-3xl font-semibold text-stone-900"
          />{" "}
          {suffix ? (
            <span className="text-sm text-stone-400">{suffix}</span>
          ) : null}
        </p>
        <p className="mt-1 text-xs text-stone-400">{label}</p>
      </CardContent>
    </Card>
  );
}

/* ---------- Varian daftar ---------- */

const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 260, damping: 24 },
  },
};

/* ---------- Baris per kebiasaan ---------- */

function HabitStatRow({ habit }: { habit: Habit }) {
  const tk = todayKey();
  const streak = streakOf(habit);
  const totalDone = doneDaysOf(habit);
  const dots = Array.from({ length: 7 }, (_, i) => {
    const k = shiftKey(tk, -(6 - i));
    return { k, done: isDone(habit, k) };
  });

  return (
    <motion.li
      variants={itemVariants}
      className="flex list-none items-center gap-3 rounded-2xl border border-stone-200/80 bg-white px-3.5 py-3"
    >
      <IconChip
        icon={habit.icon}
        category={habit.category}
        done={isDone(habit, tk)}
        className="size-9 rounded-xl"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-stone-800">
          {habit.name}
        </p>
        <p className="text-xs text-stone-400">
          {streak >= 2 ? (
            <span className="inline-flex items-center gap-1 text-amber-600">
              <Flame className="size-3" aria-hidden />
              {streak} hari
            </span>
          ) : (
            "Belum beruntun"
          )}
        </p>
      </div>
      <div className="flex gap-1" aria-label="Tujuh hari terakhir">
        {dots.map((d) => (
          <span
            key={d.k}
            title={`${shortDate(d.k)} · ${d.done ? "tuntas" : "belum"}`}
            className={cn(
              "size-2.5 rounded-full",
              d.done ? "bg-emerald-500" : "bg-stone-200"
            )}
          />
        ))}
      </div>
      <span className="w-14 shrink-0 text-right text-xs tabular-nums text-stone-400">
        {totalDone} hari
      </span>
    </motion.li>
  );
}

/* ---------- Kerangka ---------- */

function StatsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-3xl" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-3xl" />
        <Skeleton className="h-72 rounded-3xl" />
      </div>
    </div>
  );
}

/* ---------- View utama ---------- */

export function StatsView({ onTanam }: { onTanam: () => void }) {
  const { ready, habits } = useRutina();
  const tk = todayKey();

  const totalWater = habits.reduce(
    (s, h) => s + Object.values(h.history).reduce((a, b) => a + b, 0),
    0
  );
  const best = habits.reduce((m, h) => Math.max(m, bestStreakOf(h)), 0);

  const fullDays = useMemo(() => {
    let n = 0;
    for (let i = 0; i < 35; i++) {
      const k = shiftKey(tk, -i);
      const live = habits.filter((h) => existedOn(h, k));
      if (live.length > 0 && live.every((h) => isDone(h, k))) n += 1;
    }
    return n;
  }, [habits, tk]);

  const week = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const k = shiftKey(tk, -(6 - i));
        return {
          key: k,
          label: DAY_SHORT[weekdayOf(k)] ?? "",
          ratio: ratioOn(habits, k),
          isToday: k === tk,
        };
      }),
    [habits, tk]
  );

  const heatCells = useMemo(() => {
    /* mulai dari Senin minggu ke-5 dari sekarang */
    const back = 28 + ((weekdayOf(tk) + 6) % 7);
    return Array.from({ length: 35 }, (_, i) => {
      const k = shiftKey(tk, -(back - i));
      return { key: k, ratio: ratioOn(habits, k), future: k > tk };
    });
  }, [habits, tk]);

  if (!ready) return <StatsSkeleton />;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">
          Statistik
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
          Perkembangan kebunmu
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">
          Ringkasan penyiraman, runtun, dan hari-hari penuh — semua angka
          melompat dengan pegas saat berubah.
        </p>
      </div>

      {habits.length === 0 ? (
        <Card className="rounded-3xl border-amber-100">
          <CardHeader className="px-6 pt-6">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sprout className="size-5 text-amber-600" aria-hidden />
              Statistik menunggu tanaman pertama
            </CardTitle>
            <CardDescription>
              Begitu ada kebiasaan yang disirami, angka-angkanya tumbuh di
              sini.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <Button
              onClick={onTanam}
              className="rounded-full bg-amber-600 text-white hover:bg-amber-700"
            >
              <Plus aria-hidden /> Tanam kebiasaan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={Droplets}
              label="Total siraman"
              value={totalWater}
            />
            <StatCard
              icon={CheckCircle2}
              label="Kebiasaan aktif"
              value={habits.length}
            />
            <StatCard
              icon={Flame}
              label="Runtun terbaik"
              value={best}
              suffix="hari"
            />
            <StatCard
              icon={CalendarRange}
              label="Hari penuh (35 hari)"
              value={fullDays}
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="gap-0 rounded-3xl border-amber-100 py-0">
              <CardHeader className="px-6 pt-6">
                <CardTitle className="text-base">Minggu ini</CardTitle>
                <CardDescription>
                  Persentase kebiasaan tuntas per hari
                </CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div className="grid h-44 grid-cols-7 items-end gap-2 sm:gap-3">
                  {week.map((d, i) => (
                    <div
                      key={d.key}
                      className="flex h-full flex-col items-center justify-end gap-1.5"
                    >
                      <motion.div
                        initial={{ height: "4%" }}
                        animate={{
                          height: `${Math.max(4, d.ratio * 100)}%`,
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 120,
                          damping: 16,
                          delay: i * 0.05,
                        }}
                        className={cn(
                          "w-full rounded-t-xl rounded-b-md",
                          d.ratio >= 1
                            ? "bg-emerald-500"
                            : d.ratio > 0
                              ? "bg-amber-400"
                              : "bg-stone-200"
                        )}
                      />
                      <span
                        className={cn(
                          "text-xs",
                          d.isToday
                            ? "font-semibold text-amber-700"
                            : "text-stone-400"
                        )}
                      >
                        {d.label}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="gap-0 rounded-3xl border-amber-100 py-0">
              <CardHeader className="px-6 pt-6">
                <CardTitle className="text-base">Peta panas</CardTitle>
                <CardDescription>
                  Intensitas keterangan per hari, Senin sampai Minggu
                </CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <Heatmap cells={heatCells} />
              </CardContent>
            </Card>
          </div>

          <Card className="gap-0 rounded-3xl border-amber-100 py-0">
            <CardHeader className="px-6 pt-6">
              <CardTitle className="text-base">Per kebiasaan</CardTitle>
              <CardDescription>
                Runtun dan pola tujuh hari terakhir
              </CardDescription>
            </CardHeader>
            <CardContent className="px-5 pb-5 sm:px-6">
              <motion.ul
                variants={listVariants}
                initial="hidden"
                animate="show"
                className="space-y-2.5"
              >
                {habits.map((h) => (
                  <HabitStatRow key={h.id} habit={h} />
                ))}
              </motion.ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
