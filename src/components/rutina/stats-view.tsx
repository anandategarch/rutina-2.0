"use client";

import { useEffect, useMemo, useRef } from "react";
import { animate, stagger } from "animejs";
import { motion, type Variants } from "motion/react";
import {
  Award,
  CalendarRange,
  CheckCircle2,
  Flame,
  Lock,
  Plus,
  Sprout,
  Droplets,
  Trees,
  Trophy,
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
  isDone,
  ratioOn,
  scheduledOn,
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
const HEAT_WEEKS = 13;

function heatClass(ratio: number, future: boolean): string {
  if (future) return "border border-dashed border-stone-300 bg-transparent dark:border-stone-700";
  if (ratio <= 0) return "bg-stone-200/80 dark:bg-stone-800";
  if (ratio < 0.5) return "bg-emerald-200 dark:bg-emerald-900";
  if (ratio < 1) return "bg-emerald-400 dark:bg-emerald-600";
  return "bg-emerald-500 dark:bg-emerald-400";
}

/* ---------- Peta panas 13 minggu ---------- */

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
      delay: stagger(7, { grid: [7, HEAT_WEEKS], from: "center" }),
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
        <span>{HEAT_WEEKS} minggu terakhir</span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[4px] bg-stone-200/80 dark:bg-stone-800" />
          <span className="size-2.5 rounded-[4px] bg-emerald-200 dark:bg-emerald-900" />
          <span className="size-2.5 rounded-[4px] bg-emerald-400 dark:bg-emerald-600" />
          <span className="size-2.5 rounded-[4px] bg-emerald-500 dark:bg-emerald-400" />
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
    <Card className="gap-0 rounded-3xl border-amber-100 py-0 dark:border-stone-800">
      <CardContent className="px-5 py-5">
        <span className="grid size-9 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
          <Icon className="size-4.5" aria-hidden />
        </span>
        <p className="mt-3">
          <SpringNumber
            value={value}
            className="text-3xl font-semibold text-stone-900 dark:text-stone-50"
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

/* ---------- Lencana ---------- */

type BadgeDef = {
  id: string;
  icon: typeof Trophy;
  name: string;
  desc: string;
  earned: boolean;
  progress: string;
};

function BadgeCard({ badge }: { badge: BadgeDef }) {
  return (
    <motion.div
      variants={itemVariants}
      className={cn(
        "flex w-36 shrink-0 flex-col items-center gap-1.5 rounded-3xl border px-3 py-4 text-center",
        badge.earned
          ? "border-amber-300 bg-gradient-to-b from-amber-50 to-white dark:border-amber-600/50 dark:from-amber-500/10 dark:to-stone-900"
          : "border-stone-200/80 bg-white opacity-70 dark:border-stone-800 dark:bg-stone-900"
      )}
    >
      <span
        className={cn(
          "grid size-12 place-items-center rounded-2xl",
          badge.earned
            ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
            : "bg-stone-100 text-stone-400 dark:bg-stone-800 dark:text-stone-600"
        )}
      >
        {badge.earned ? (
          <badge.icon className="size-6" aria-hidden />
        ) : (
          <Lock className="size-5" aria-hidden />
        )}
      </span>
      <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">
        {badge.name}
      </p>
      <p className="text-[11px] leading-snug text-stone-400">{badge.desc}</p>
      <p
        className={cn(
          "mt-auto rounded-full px-2 py-0.5 text-[10px] font-semibold",
          badge.earned
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
            : "bg-stone-100 text-stone-400 dark:bg-stone-800"
        )}
      >
        {badge.progress}
      </p>
    </motion.div>
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

function HabitStatRow({
  habit,
  onDetail,
}: {
  habit: Habit;
  onDetail: (h: Habit) => void;
}) {
  const tk = todayKey();
  const streak = streakOf(habit);
  const totalDone = doneDaysOf(habit);
  const dots = Array.from({ length: 7 }, (_, i) => {
    const k = shiftKey(tk, -(6 - i));
    const state = !scheduledOn(habit, k)
      ? "off"
      : isDone(habit, k)
        ? "done"
        : "miss";
    return { k, state };
  });

  return (
    <motion.li variants={itemVariants} className="list-none">
      <button
        type="button"
        onClick={() => onDetail(habit)}
        className="flex w-full items-center gap-3 rounded-2xl border border-stone-200/80 bg-white px-3.5 py-3 text-left transition hover:border-amber-300 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-amber-700/60"
        aria-label={`Buka detail ${habit.name}`}
      >
        <IconChip
          icon={habit.icon}
          category={habit.category}
          done={isDone(habit, tk)}
          className="size-9 rounded-xl"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-stone-800 dark:text-stone-100">
            {habit.name}
          </p>
          <p className="text-xs text-stone-400">
            {streak >= 2 ? (
              <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
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
              title={`${shortDate(d.k)} · ${d.state === "done" ? "tuntas" : d.state === "miss" ? "terlewat" : "di luar jadwal"}`}
              className={cn(
                "size-2.5 rounded-full",
                d.state === "done" && "bg-emerald-500",
                d.state === "miss" && "bg-stone-200 dark:bg-stone-700",
                d.state === "off" && "bg-stone-100 dark:bg-stone-800"
              )}
            />
          ))}
        </div>
        <span className="w-14 shrink-0 text-right text-xs tabular-nums text-stone-400">
          {totalDone} hari
        </span>
      </button>
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

export function StatsView({
  onTanam,
  onDetail,
}: {
  onTanam: () => void;
  onDetail: (h: Habit) => void;
}) {
  const { ready, habits } = useRutina();
  const tk = todayKey();

  const totalWater = habits.reduce(
    (s, h) => s + Object.values(h.history).reduce((a, b) => a + b, 0),
    0
  );
  const best = habits.reduce((m, h) => Math.max(m, bestStreakOf(h)), 0);

  const fullDays = useMemo(() => {
    let n = 0;
    for (let i = 0; i < 91; i++) {
      const k = shiftKey(tk, -i);
      if (ratioOn(habits, k) >= 1) {
        const live = habits.filter((h) => scheduledOn(h, k));
        if (live.length > 0) n += 1;
      }
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
    /* mulai dari Senin pada minggu ke-13 dari sekarang */
    const back = (HEAT_WEEKS - 1) * 7 + ((weekdayOf(tk) + 6) % 7);
    return Array.from({ length: HEAT_WEEKS * 7 }, (_, i) => {
      const k = shiftKey(tk, -(back - i));
      return { key: k, ratio: ratioOn(habits, k), future: k > tk };
    });
  }, [habits, tk]);

  const badges: BadgeDef[] = useMemo(() => {
    const planted = habits.length;
    const anyBest = best;
    return [
      {
        id: "tunas",
        icon: Sprout,
        name: "Tunas Pertama",
        desc: "Tanam kebiasaan pertama",
        earned: planted >= 1,
        progress: planted >= 1 ? "Diraih" : `${planted}/1`,
      },
      {
        id: "rimbun",
        icon: Trees,
        name: "Kebun Rimbun",
        desc: "Rawat 5 kebiasaan sekaligus",
        earned: planted >= 5,
        progress: `${planted}/5`,
      },
      {
        id: "runtun7",
        icon: Flame,
        name: "Api Mingguan",
        desc: "Runtun 7 hari berurutan",
        earned: anyBest >= 7,
        progress: `${anyBest}/7`,
      },
      {
        id: "runtun30",
        icon: Trophy,
        name: "Sebulan Setia",
        desc: "Runtun 30 hari berurutan",
        earned: anyBest >= 30,
        progress: `${anyBest}/30`,
      },
      {
        id: "satu",
        icon: Award,
        name: "Hari Penuh",
        desc: "Tuntas semua kebiasaan sehari",
        earned: fullDays >= 1,
        progress: `${fullDays}/1`,
      },
      {
        id: "lima",
        icon: Award,
        name: "Lima Hari Penuh",
        desc: "Lima hari semua tuntas",
        earned: fullDays >= 5,
        progress: `${fullDays}/5`,
      },
      {
        id: "seratus",
        icon: Droplets,
        name: "Seratus Siraman",
        desc: "Total 100 penyiraman",
        earned: totalWater >= 100,
        progress: `${totalWater}/100`,
      },
    ];
  }, [habits, best, fullDays, totalWater]);

  if (!ready) return <StatsSkeleton />;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">
          Statistik
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl dark:text-stone-50">
          Perkembangan kebunmu
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          Ringkasan penyiraman, runtun, dan hari-hari penuh — semua angka
          melompat dengan pegas saat berubah.
        </p>
      </div>

      {habits.length === 0 ? (
        <Card className="rounded-3xl border-amber-100 dark:border-stone-800">
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
              label="Hari penuh (91 hari)"
              value={fullDays}
            />
          </div>

          {/* lencana */}
          <Card className="gap-0 rounded-3xl border-amber-100 py-0 dark:border-stone-800">
            <CardHeader className="px-5 pt-6 sm:px-6">
              <CardTitle className="text-base">Lencana</CardTitle>
              <CardDescription>
                Tonggak kecil ala aplikasi habit tracker — kumpulkan seiring
                konsistensi
              </CardDescription>
            </CardHeader>
            <CardContent className="px-5 pb-6 sm:px-6">
              <motion.ul
                variants={listVariants}
                initial="hidden"
                animate="show"
                className="flex snap-x gap-3 overflow-x-auto pb-1 [scrollbar-width:thin]"
                aria-label="Daftar lencana"
              >
                {badges.map((b) => (
                  <BadgeCard key={b.id} badge={b} />
                ))}
              </motion.ul>
            </CardContent>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="gap-0 rounded-3xl border-amber-100 py-0 dark:border-stone-800">
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
                            ? "bg-emerald-500 dark:bg-emerald-400"
                            : d.ratio > 0
                              ? "bg-amber-400 dark:bg-amber-500"
                              : "bg-stone-200 dark:bg-stone-800"
                        )}
                      />
                      <span
                        className={cn(
                          "text-xs",
                          d.isToday
                            ? "font-semibold text-amber-700 dark:text-amber-400"
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

            <Card className="gap-0 rounded-3xl border-amber-100 py-0 dark:border-stone-800">
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

          <Card className="gap-0 rounded-3xl border-amber-100 py-0 dark:border-stone-800">
            <CardHeader className="px-6 pt-6">
              <CardTitle className="text-base">Per kebiasaan</CardTitle>
              <CardDescription>
                Runtun dan pola tujuh hari terakhir — ketuk untuk detail
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
                  <HabitStatRow key={h.id} habit={h} onDetail={onDetail} />
                ))}
              </motion.ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
