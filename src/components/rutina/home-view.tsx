"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import {
  AlarmClock,
  CalendarOff,
  Droplets,
  Flame,
  PartyPopper,
  Plus,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

import {
  CATEGORY_META,
  DAY_SHORT,
  QUOTES,
  SUGGESTIONS,
  countOn,
  existedOn,
  isDone,
  makeHabit,
  ratioOn,
  scheduledOn,
  shiftKey,
  shortDate,
  streakOf,
  todayKey,
  useRutina,
  weekdayOf,
  type Category,
  type Habit,
  type HabitDraft,
} from "@/lib/rutina";
import { cn } from "@/lib/utils";
import {
  CheckDraw,
  ConfettiBurst,
  IconChip,
  PlantSVG,
  SpringNumber,
  SunRing,
} from "./bits";

const CATEGORY_ORDER: Category[] = ["pagi", "siang", "malam", "bebas"];

/* ---------- Strip mingguan ---------- */

function WeekStrip({
  selected,
  onSelect,
  habits,
}: {
  selected: string;
  onSelect: (k: string) => void;
  habits: Habit[];
}) {
  const tk = todayKey();
  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const k = shiftKey(tk, -(6 - i));
        return {
          key: k,
          label: DAY_SHORT[weekdayOf(k)] ?? "",
          num: Number(k.slice(8, 10)),
          ratio: ratioOn(habits, k),
          isToday: k === tk,
        };
      }),
    [habits, tk]
  );

  return (
    <div
      className="flex gap-1.5"
      role="tablist"
      aria-label="Pilih hari dalam seminggu terakhir"
    >
      {days.map((d) => {
        const active = d.key === selected;
        return (
          <button
            type="button"
            role="tab"
            aria-selected={active}
            key={d.key}
            onClick={() => onSelect(d.key)}
            className={cn(
              "relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-2xl border px-1 py-2.5 transition",
              active
                ? "border-amber-500 bg-amber-100/70 dark:border-amber-500/60 dark:bg-amber-500/15"
                : "border-stone-200/80 bg-white hover:border-amber-300 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700"
            )}
          >
            <span
              className={cn(
                "text-[10px] font-semibold uppercase tracking-wide",
                d.isToday
                  ? "text-amber-700 dark:text-amber-400"
                  : "text-stone-400"
              )}
            >
              {d.isToday ? "Hari ini" : d.label}
            </span>
            <span
              className={cn(
                "text-sm font-semibold tabular-nums",
                active
                  ? "text-stone-900 dark:text-stone-100"
                  : "text-stone-500 dark:text-stone-400"
              )}
            >
              {d.num}
            </span>
            <span
              aria-hidden
              className={cn(
                "mt-0.5 size-1.5 rounded-full",
                d.ratio >= 1
                  ? "bg-emerald-500"
                  : d.ratio > 0
                    ? "bg-amber-400"
                    : "bg-transparent"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Baris kebiasaan ---------- */

function HabitRow({
  habit,
  dayKey,
  onDetail,
}: {
  habit: Habit;
  dayKey: string;
  onDetail: (h: Habit) => void;
}) {
  const { setCountOn } = useRutina();
  const count = countOn(habit, dayKey);
  const done = count >= habit.target;
  const streak = streakOf(habit);
  const meta = CATEGORY_META[habit.category];
  const offDay = !scheduledOn(habit, dayKey);

  const toggle = () => {
    if (offDay) return;
    setCountOn(habit.id, dayKey, done ? 0 : count + 1);
    toast.success("Berhasil disimpan");
  };

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      className={cn("list-none", offDay && "opacity-60")}
    >
      <div
        className={cn(
          "flex items-center gap-3 rounded-2xl border px-3.5 py-3 transition-colors",
          done
            ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30"
            : "border-stone-200/90 bg-white hover:border-amber-300 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-amber-700/60"
        )}
      >
        <button
          type="button"
          onClick={() => onDetail(habit)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-label={`Buka detail ${habit.name}`}
        >
          <IconChip
            icon={habit.icon}
            category={habit.category}
            done={done}
          />
          <span className="min-w-0 flex-1">
            <span
              className={cn(
                "block truncate text-sm font-medium",
                done
                  ? "text-stone-400 line-through dark:text-stone-500"
                  : "text-stone-800 dark:text-stone-100"
              )}
            >
              {habit.name}
            </span>
            <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-400">
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 font-medium",
                  done
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                    : meta.chip
                )}
              >
                {meta.label}
              </span>
              {habit.schedule.length < 7 && (
                <span className="rounded-full bg-stone-100 px-2 py-0.5 font-medium text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                  {habit.schedule.length}x/mgg
                </span>
              )}
              {habit.reminder && (
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <AlarmClock className="size-3" aria-hidden />
                  {habit.reminder}
                </span>
              )}
              {streak >= 2 && (
                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <Flame className="size-3.5" aria-hidden />
                  {streak} hari
                </span>
              )}
              {habit.target > 1 && !offDay && (
                <span className="tabular-nums">
                  {count}/{habit.target} kali
                </span>
              )}
            </span>
            {habit.target > 1 && !done && !offDay && (
              <Progress
                value={(count / habit.target) * 100}
                className="mt-2 h-1.5"
              />
            )}
          </span>
        </button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.85 }}
          onClick={toggle}
          disabled={offDay}
          aria-pressed={done}
          aria-label={`${done ? "Batalkan" : "Selesaikan"} ${habit.name}${offDay ? " — tidak terjadwal hari ini" : ""}`}
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-full border-2 transition-colors",
            offDay &&
              "cursor-not-allowed border-stone-200 bg-stone-100 text-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-700",
            !offDay &&
              done &&
              "border-emerald-500 bg-emerald-500 text-white",
            !offDay &&
              !done &&
              "border-stone-300 text-transparent hover:border-amber-500 dark:border-stone-700"
          )}
        >
          <CheckDraw done={done} className="size-5" />
        </motion.button>
      </div>
    </motion.li>
  );
}

/* ---------- Kartu statistik mini ---------- */

function MiniStat({
  icon: Icon,
  label,
  value,
  suffix,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <Card className="gap-0 rounded-3xl border-amber-100 py-0 dark:border-stone-800">
      <CardContent className="px-4 py-4">
        <span className="grid size-8 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
          <Icon className="size-4" aria-hidden />
        </span>
        <p className="mt-2">
          <SpringNumber
            value={value}
            className="text-2xl font-semibold text-stone-900 dark:text-stone-50"
          />{" "}
          {suffix ? (
            <span className="text-sm text-stone-400">{suffix}</span>
          ) : null}
        </p>
        <p className="mt-0.5 text-xs text-stone-400">{label}</p>
      </CardContent>
    </Card>
  );
}

/* ---------- Keadaan kosong ---------- */

function EmptyState({
  onTanam,
  onSuggest,
}: {
  onTanam: () => void;
  onSuggest: (s: HabitDraft) => void;
}) {
  return (
    <Card className="rounded-3xl border-amber-100 dark:border-stone-800">
      <CardContent className="grid place-items-center px-6 py-12 text-center">
        <PlantSVG
          stage={1}
          flower="#FBBF24"
          drawKey="kebun-kosong"
          className="h-36 w-36"
        />
        <h2 className="mt-4 text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
          Kebunmu masih kosong
        </h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          Tanam kebiasaan pertamamu — mulai dari yang paling kecil. Pilih
          tanaman jadi di bawah, atau tanam sendiri sesukamu.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.slice(0, 4).map((s) => (
            <button
              type="button"
              key={s.name}
              onClick={() => onSuggest(s)}
              className="flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3.5 py-2 text-sm text-stone-600 transition hover:border-amber-400 hover:text-amber-700 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:border-amber-600"
            >
              <IconChip
                icon={s.icon}
                category={s.category}
                className="size-6 rounded-lg"
              />
              {s.name}
            </button>
          ))}
        </div>
        <Button
          onClick={onTanam}
          className="mt-6 rounded-full bg-amber-600 text-white hover:bg-amber-700"
        >
          <Plus aria-hidden /> Tanam sendiri
        </Button>
      </CardContent>
    </Card>
  );
}

/* ---------- Kerangka pemuatan ---------- */

function HomeSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-4 w-44 rounded-full" />
        <Skeleton className="h-10 w-64 rounded-2xl" />
        <Skeleton className="h-4 w-96 max-w-full rounded-full" />
      </div>
      <Skeleton className="h-20 rounded-2xl" />
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <Skeleton className="h-80 rounded-3xl" />
        <Skeleton className="h-80 rounded-3xl" />
      </div>
    </div>
  );
}

/* ---------- View utama ---------- */

export function HomeView({
  onTanam,
  onDetail,
}: {
  onTanam: () => void;
  onDetail: (h: Habit) => void;
}) {
  const { ready, habits, addHabit } = useRutina();
  const [selKey, setSelKey] = useState(todayKey());
  const [greet, setGreet] = useState<{
    line: string;
    date: string;
    quote: string;
  } | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      const h = new Date().getHours();
      const line =
        h < 4
          ? "Selamat malam"
          : h < 11
            ? "Selamat pagi"
            : h < 15
              ? "Selamat siang"
              : h < 19
                ? "Selamat sore"
                : "Selamat malam";
      const date = new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date());
      const day = Math.floor(Date.now() / 86400000);
      setGreet({ line, date, quote: QUOTES[day % QUOTES.length] ?? "" });
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const tk = todayKey();
  const isToday = selKey === tk;

  const dayScheduled = useMemo(
    () => habits.filter((h) => scheduledOn(h, selKey)),
    [habits, selKey]
  );
  const dayOff = useMemo(
    () =>
      habits.filter((h) => existedOn(h, selKey) && !scheduledOn(h, selKey)),
    [habits, selKey]
  );

  const done = dayScheduled.filter((h) => isDone(h, selKey)).length;
  const total = dayScheduled.length;
  const allDone = total > 0 && done === total;

  const sorted = useMemo(
    () =>
      [...dayScheduled].sort((a, b) => {
        const da = isDone(a, selKey) ? 1 : 0;
        const db = isDone(b, selKey) ? 1 : 0;
        if (da !== db) return da - db;
        return (
          CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
        );
      }),
    [dayScheduled, selKey]
  );

  const maxStreak = habits.reduce((m, h) => Math.max(m, streakOf(h)), 0);
  const totalWater = habits.reduce(
    (s, h) => s + Object.values(h.history).reduce((a, b) => a + b, 0),
    0
  );

  /* Konfeti hanya saat transisi menjadi semua-tuntas */
  const prevAll = useRef<boolean | null>(null);
  const [fireKey, setFireKey] = useState(0);
  useEffect(() => {
    if (!ready) return;
    const id = window.setTimeout(() => {
      if (prevAll.current === null) {
        prevAll.current = allDone;
        return;
      }
      if (allDone && !prevAll.current) setFireKey((k) => k + 1);
      prevAll.current = allDone;
    }, 0);
    return () => window.clearTimeout(id);
  }, [allDone, ready]);

  if (!ready) return <HomeSkeleton />;

  return (
    <div className="space-y-6">
      {/* sapaan */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">
          {greet?.date ?? "Memuat hari…"}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl dark:text-stone-50">
          {greet?.line ?? "Halo"}
          <span className="text-amber-600">.</span>
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          {greet?.quote ?? ""}
        </p>
      </div>

      {/* strip mingguan */}
      <WeekStrip selected={selKey} onSelect={setSelKey} habits={habits} />

      {total === 0 && dayOff.length === 0 ? (
        <EmptyState
          onTanam={onTanam}
          onSuggest={(s) => {
            addHabit(makeHabit(s));
            toast.success("Berhasil disimpan");
          }}
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          {/* kolom kiri: cincin matahari + statistik mini */}
          <div className="space-y-5">
            <Card className="gap-0 overflow-hidden rounded-3xl border-amber-100 py-0 dark:border-stone-800">
              <CardHeader className="px-6 pb-2 pt-6">
                <CardTitle className="text-sm">
                  {isToday ? "Hari ini" : shortDate(selKey)}
                </CardTitle>
                <CardDescription>
                  {isToday
                    ? "Progres penyiraman kebun"
                    : "Tinjau atau tandai ulang hari terpilih"}
                </CardDescription>
              </CardHeader>
              <CardContent className="relative grid place-items-center px-6 pb-6 pt-2">
                <SunRing done={done} total={total} />
                <ConfettiBurst fireKey={fireKey} />
              </CardContent>
              <AnimatePresence initial={false}>
                {allDone && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden border-t border-emerald-100 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40"
                  >
                    <p className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                      <PartyPopper className="size-4 shrink-0" aria-hidden />
                      Semua kebiasaan tuntas — kebunmu bersinar hari ini.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <MiniStat
                icon={Flame}
                label="Runtun terpanjang"
                value={maxStreak}
                suffix="hari"
              />
              <MiniStat
                icon={Droplets}
                label="Total siraman"
                value={totalWater}
              />
            </div>
          </div>

          {/* kolom kanan: daftar kebiasaan */}
          <Card className="gap-0 self-start rounded-3xl border-amber-100 py-0 dark:border-stone-800">
            <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-amber-50 px-5 py-4 dark:border-stone-800/70">
              <div>
                <CardTitle className="text-base">
                  {isToday ? "Kebiasaan hari ini" : `Kebiasaan ${shortDate(selKey)}`}
                </CardTitle>
                <CardDescription>
                  Ketuk baris untuk detail — lingkaran untuk menandai tuntas
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={onTanam}
                className="shrink-0 rounded-full bg-amber-600 text-white hover:bg-amber-700"
              >
                <Plus aria-hidden /> Tanam
              </Button>
            </CardHeader>
            <CardContent className="px-5 py-4">
              <ul className="space-y-2.5">
                <AnimatePresence initial={false}>
                  {sorted.map((h) => (
                    <HabitRow
                      key={h.id}
                      habit={h}
                      dayKey={selKey}
                      onDetail={onDetail}
                    />
                  ))}
                </AnimatePresence>
              </ul>

              {dayOff.length > 0 && (
                <div className="mt-5">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-stone-400">
                    <CalendarOff className="size-3.5" aria-hidden />
                    Di luar jadwal hari ini
                  </p>
                  <ul className="space-y-2">
                    {dayOff.map((h) => (
                      <HabitRow
                        key={h.id}
                        habit={h}
                        dayKey={selKey}
                        onDetail={onDetail}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
