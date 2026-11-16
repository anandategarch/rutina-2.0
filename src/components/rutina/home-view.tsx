"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import {
  Droplets,
  Flame,
  MoreVertical,
  PartyPopper,
  Pencil,
  Plus,
  Trash2,
  type LucideIcon,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

import {
  CATEGORY_META,
  QUOTES,
  SUGGESTIONS,
  countOn,
  isDone,
  makeHabit,
  streakOf,
  todayKey,
  useRutina,
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

/* ---------- Menu per baris ---------- */

function HabitMenu({
  habit,
  onEdit,
}: {
  habit: Habit;
  onEdit: (h: Habit) => void;
}) {
  const { removeHabit, addHabit } = useRutina();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const doDelete = () => {
    removeHabit(habit.id);
    setConfirmOpen(false);
    toast("Kebiasaan dihapus", {
      action: { label: "Urungkan", onClick: () => addHabit(habit) },
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 rounded-full text-stone-400 hover:text-stone-600"
            aria-label={`Menu ${habit.name}`}
          >
            <MoreVertical aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={() => onEdit(habit)}>
            <Pencil aria-hidden /> Ubah
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 aria-hidden /> Hapus
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Cabut kebiasaan ini?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{habit.name}&rdquo; beserta riwayatnya akan dicabut dari
              kebun. Kamu masih bisa mengurungkannya sesaat setelahnya.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={doDelete}
              className="rounded-full bg-rose-600 hover:bg-rose-700"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* ---------- Baris kebiasaan ---------- */

function HabitRow({
  habit,
  onEdit,
}: {
  habit: Habit;
  onEdit: (h: Habit) => void;
}) {
  const { setTodayCount } = useRutina();
  const tk = todayKey();
  const count = countOn(habit, tk);
  const done = count >= habit.target;
  const streak = streakOf(habit);
  const meta = CATEGORY_META[habit.category];

  const toggle = () => {
    setTodayCount(habit.id, done ? 0 : count + 1);
    toast.success("Berhasil disimpan");
  };

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      className="list-none"
    >
      <div
        className={cn(
          "flex items-center gap-3 rounded-2xl border px-3.5 py-3 transition-colors",
          done
            ? "border-emerald-200 bg-emerald-50/60"
            : "border-stone-200/90 bg-white hover:border-amber-300"
        )}
      >
        <IconChip
          icon={habit.icon}
          category={habit.category}
          done={done}
        />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate text-sm font-medium",
              done ? "text-stone-400 line-through" : "text-stone-800"
            )}
          >
            {habit.name}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-400">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 font-medium",
                done ? "bg-emerald-100 text-emerald-700" : meta.chip
              )}
            >
              {meta.label}
            </span>
            {streak >= 2 && (
              <span className="inline-flex items-center gap-1 text-amber-600">
                <Flame className="size-3.5" aria-hidden />
                {streak} hari
              </span>
            )}
            {habit.target > 1 && (
              <span className="tabular-nums">
                {count}/{habit.target} kali
              </span>
            )}
          </div>
          {habit.target > 1 && !done && (
            <Progress
              value={(count / habit.target) * 100}
              className="mt-2 h-1.5"
            />
          )}
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.85 }}
          onClick={toggle}
          aria-pressed={done}
          aria-label={`${done ? "Batalkan" : "Selesaikan"} ${habit.name}`}
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-full border-2 transition-colors",
            done
              ? "border-emerald-500 bg-emerald-500 text-white"
              : "border-stone-300 text-transparent hover:border-amber-500"
          )}
        >
          <CheckDraw done={done} className="size-5" />
        </motion.button>

        <HabitMenu habit={habit} onEdit={onEdit} />
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
    <Card className="gap-0 rounded-3xl border-amber-100 py-0">
      <CardContent className="px-4 py-4">
        <span className="grid size-8 place-items-center rounded-xl bg-amber-100 text-amber-700">
          <Icon className="size-4" aria-hidden />
        </span>
        <p className="mt-2">
          <SpringNumber
            value={value}
            className="text-2xl font-semibold text-stone-900"
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
    <Card className="rounded-3xl border-amber-100">
      <CardContent className="grid place-items-center px-6 py-12 text-center">
        <PlantSVG
          stage={1}
          flower="#FBBF24"
          drawKey="kebun-kosong"
          className="h-36 w-36"
        />
        <h2 className="mt-4 text-xl font-semibold tracking-tight text-stone-900">
          Kebunmu masih kosong
        </h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-stone-500">
          Tanam kebiasaan pertamamu — mulai dari yang paling kecil. Pilih
          tanaman jadi di bawah, atau tanam sendiri sesukamu.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.slice(0, 4).map((s) => (
            <button
              type="button"
              key={s.name}
              onClick={() => onSuggest(s)}
              className="flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3.5 py-2 text-sm text-stone-600 transition hover:border-amber-400 hover:text-amber-700"
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
  onEdit,
}: {
  onTanam: () => void;
  onEdit: (h: Habit) => void;
}) {
  const { ready, habits, addHabit } = useRutina();
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
  const done = habits.filter((h) => isDone(h, tk)).length;
  const total = habits.length;
  const allDone = total > 0 && done === total;

  const sorted = useMemo(
    () =>
      [...habits].sort((a, b) => {
        const da = isDone(a, tk) ? 1 : 0;
        const db = isDone(b, tk) ? 1 : 0;
        if (da !== db) return da - db;
        return (
          CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
        );
      }),
    [habits, tk]
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
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">
          {greet?.date ?? "Memuat hari…"}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
          {greet?.line ?? "Halo"}
          <span className="text-amber-600">.</span>
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-stone-500">
          {greet?.quote ?? ""}
        </p>
      </div>

      {total === 0 ? (
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
            <Card className="gap-0 overflow-hidden rounded-3xl border-amber-100 py-0">
              <CardHeader className="px-6 pb-2 pt-6">
                <CardTitle className="text-sm">Hari ini</CardTitle>
                <CardDescription>Progres penyiraman kebun</CardDescription>
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
                    className="overflow-hidden border-t border-emerald-100 bg-emerald-50"
                  >
                    <p className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-emerald-700">
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
          <Card className="gap-0 self-start rounded-3xl border-amber-100 py-0">
            <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-amber-50 px-5 py-4">
              <div>
                <CardTitle className="text-base">Kebiasaan hari ini</CardTitle>
                <CardDescription>
                  Ketuk lingkaran untuk menandai tuntas
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={onTanam}
                className="rounded-full bg-amber-600 text-white hover:bg-amber-700"
              >
                <Plus aria-hidden /> Tanam
              </Button>
            </CardHeader>
            <CardContent className="px-5 py-4">
              <ul className="space-y-2.5">
                <AnimatePresence initial={false}>
                  {sorted.map((h) => (
                    <HabitRow key={h.id} habit={h} onEdit={onEdit} />
                  ))}
                </AnimatePresence>
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
