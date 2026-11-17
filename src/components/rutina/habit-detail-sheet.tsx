"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlarmClock,
  CalendarDays,
  Droplets,
  Flame,
  Medal,
  Pencil,
  Trash2,
  TrendingUp,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

import {
  CATEGORY_META,
  DAY_SHORT,
  bestStreakOf,
  doneDaysOf,
  existedOn,
  habitScore,
  isDone,
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
import { IconChip, ScoreRing, SpringNumber } from "./bits";

/* Urutan tampil Senin..Minggu */
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

/* ---------- Statistik kecil ---------- */

function DetailStat({
  icon: Icon,
  label,
  value,
  suffix,
}: {
  icon: typeof Flame;
  label: string;
  value: number | null;
  suffix?: string;
}) {
  return (
    <div className="rounded-2xl border border-stone-200/80 bg-white px-3 py-3 text-center dark:border-stone-800 dark:bg-stone-900">
      <Icon
        className="mx-auto size-4 text-amber-600 dark:text-amber-400"
        aria-hidden
      />
      <p className="mt-1.5 text-lg font-semibold tabular-nums text-stone-900 dark:text-stone-50">
        {value === null ? "—" : <SpringNumber value={value} />}
        {suffix && value !== null ? (
          <span className="ml-0.5 text-xs font-normal text-stone-400">
            {suffix}
          </span>
        ) : null}
      </p>
      <p className="mt-0.5 text-[11px] text-stone-400">{label}</p>
    </div>
  );
}

/* ---------- Kalender riwayat 10 minggu ---------- */

function HistoryGrid({ habit }: { habit: Habit }) {
  const tk = todayKey();
  const cells = useMemo(() => {
    /* mulai Senin 9 minggu sebelum minggu ini */
    const back = 63 + ((weekdayOf(tk) + 6) % 7);
    return Array.from({ length: 70 }, (_, i) => {
      const k = shiftKey(tk, -(back - i));
      return { key: k, state: cellState(habit, k), future: k > tk };
    });
  }, [habit, tk]);

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((c) => (
          <span
            key={c.key}
            title={`${shortDate(c.key)} · ${c.future ? "belum terjadi" : cellLabel(c.state)}`}
            className={cn(
              "aspect-square rounded-[5px]",
              c.future && "opacity-30",
              c.state === "done" && "bg-emerald-500",
              c.state === "miss" && "bg-stone-200 dark:bg-stone-800",
              c.state === "off" && "bg-stone-100 dark:bg-stone-900",
              c.state === "before" && "bg-transparent"
            )}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-stone-400">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[4px] bg-emerald-500" /> Tuntas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[4px] bg-stone-200 dark:bg-stone-800" />{" "}
          Terjadwal, terlewat
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[4px] bg-stone-100 dark:bg-stone-900" />{" "}
          Di luar jadwal
        </span>
      </div>
    </div>
  );
}

function cellState(h: Habit, key: string): "done" | "miss" | "off" | "before" {
  if (!existedOn(h, key)) return "before";
  if (isDone(h, key)) return "done";
  if (scheduledOn(h, key)) return "miss";
  return "off";
}

function cellLabel(s: string): string {
  if (s === "done") return "tuntas";
  if (s === "miss") return "terlewat";
  if (s === "off") return "di luar jadwal";
  return "belum ditanam";
}

/* ---------- Isi detail (dipakai Drawer & Dialog) ---------- */

function DetailBody({
  habit,
  onEdit,
}: {
  habit: Habit;
  onEdit: (h: Habit) => void;
}) {
  const { updateHabit, removeHabit, addHabit, setTodayCount } = useRutina();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const tk = todayKey();
  const meta = CATEGORY_META[habit.category];

  const streak = streakOf(habit);
  const best = bestStreakOf(habit);
  const total = doneDaysOf(habit);
  const score = habitScore(habit);

  /* kepatuhan: rasio tuntas atas hari terjadwal sejak ditanam */
  const compliance = useMemo(() => {
    let sched = 0;
    let done = 0;
    let k = habit.createdAt;
    let guard = 0;
    while (k <= tk && guard < 400) {
      if (scheduledOn(habit, k)) {
        sched += 1;
        if (isDone(habit, k)) done += 1;
      }
      k = shiftKey(k, 1);
      guard += 1;
    }
    return sched === 0 ? null : Math.round((done / sched) * 100);
  }, [habit, tk]);

  const doneToday = isDone(habit, tk);
  const scheduledToday = scheduledOn(habit, tk);

  const toggleDay = (day: number) => {
    const next = habit.schedule.includes(day)
      ? habit.schedule.filter((d) => d !== day)
      : [...habit.schedule, day].sort((a, b) => a - b);
    if (next.length === 0) return; /* minimal satu hari aktif */
    updateHabit(habit.id, { schedule: next });
  };

  const doDelete = () => {
    removeHabit(habit.id);
    setConfirmOpen(false);
    toast("Kebiasaan dihapus", {
      action: { label: "Urungkan", onClick: () => addHabit(habit) },
    });
  };

  return (
    <div className="space-y-5">
      {/* kepala + aksi */}
      <div className="flex items-start gap-3">
        <IconChip
          icon={habit.icon}
          category={habit.category}
          done={doneToday}
          className="size-12 rounded-2xl"
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-50">
            {habit.name}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 font-medium",
                meta.chip
              )}
            >
              {meta.label}
            </span>
            <span className="rounded-full bg-stone-100 px-2 py-0.5 font-medium text-stone-500 dark:bg-stone-800 dark:text-stone-400">
              {habit.schedule.length === 7
                ? "Tiap hari"
                : `${habit.schedule.length}x seminggu`}
            </span>
            {habit.reminder && (
              <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 font-medium tabular-nums text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                <AlarmClock className="size-3" aria-hidden />
                {habit.reminder}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 rounded-full text-stone-400 hover:text-amber-700 dark:hover:text-amber-400"
            onClick={() => onEdit(habit)}
            aria-label={`Ubah ${habit.name}`}
          >
            <Pencil className="size-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 rounded-full text-stone-400 hover:text-rose-600 dark:hover:text-rose-400"
            onClick={() => setConfirmOpen(true)}
            aria-label={`Hapus ${habit.name}`}
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        </div>
      </div>

      {/* skor kekuatan */}
      <div className="grid items-center gap-4 rounded-3xl border border-amber-100 bg-amber-50/50 px-4 py-4 sm:grid-cols-[auto_1fr] dark:border-stone-800 dark:bg-stone-900">
        <ScoreRing score={score} label="kekuatan" />
        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-stone-800 dark:text-stone-100">
            <Medal className="size-4 text-amber-600 dark:text-amber-400" aria-hidden />
            Skor kekuatan kebiasaan
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
            Mengikuti gagasan Loop Habit Tracker: setiap penyelesaian
            menguatkan kebiasaan, setiap hari terlewat melemahkannya — tapi
            runtun panjang tak runtuh hanya karena absen sesaat. Dihitung
            berbobot dari 28 hari terjadwal terakhir.
          </p>
        </div>
      </div>

      {/* statistik */}
      <div className="grid grid-cols-4 gap-2">
        <DetailStat icon={Flame} label="Runtun" value={streak} suffix="hari" />
        <DetailStat icon={TrendingUp} label="Terbaik" value={best} suffix="hari" />
        <DetailStat icon={Droplets} label="Tuntas" value={total} suffix="hari" />
        <DetailStat icon={Medal} label="Patuh" value={compliance} suffix="%" />
      </div>

      {/* kalender */}
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-stone-800 dark:text-stone-100">
          <CalendarDays className="size-4 text-amber-600 dark:text-amber-400" aria-hidden />
          Riwayat 10 minggu
        </p>
        <HistoryGrid habit={habit} />
      </div>

      <Separator className="bg-stone-200/70 dark:bg-stone-800" />

      {/* editor jadwal & pengingat */}
      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">
            Jadwal aktif
          </p>
          <p className="mb-2 text-xs text-stone-400">
            Hari di luar jadwal tak menghitung runtun — bebas atur 3x seminggu
            dan semacamnya.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {DAY_ORDER.map((d) => {
              const active = habit.schedule.includes(d);
              return (
                <button
                  type="button"
                  key={d}
                  onClick={() => toggleDay(d)}
                  aria-pressed={active}
                  aria-label={`${DAY_SHORT[d]} ${active ? "aktif" : "nonaktif"}`}
                  className={cn(
                    "h-9 w-11 rounded-xl border text-xs font-semibold transition",
                    active
                      ? "border-amber-500 bg-amber-100 text-amber-800 dark:border-amber-500/60 dark:bg-amber-500/15 dark:text-amber-300"
                      : "border-stone-200 bg-white text-stone-400 hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700"
                  )}
                >
                  {DAY_SHORT[d]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">
              Pengingat
            </p>
            <p className="text-xs text-stone-400">
              Muncul sebagai notifikasi selama aplikasi terbuka.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="time"
              value={habit.reminder ?? ""}
              onChange={(e) =>
                updateHabit(habit.id, {
                  reminder: e.target.value || null,
                })
              }
              className="h-9 w-32 rounded-xl tabular-nums"
              aria-label="Waktu pengingat"
            />
            {habit.reminder && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 rounded-xl px-2.5 text-stone-400 hover:text-rose-600"
                onClick={() => updateHabit(habit.id, { reminder: null })}
                aria-label="Hapus pengingat"
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* aksi */}
      <Button
        onClick={() => {
          setTodayCount(habit.id, doneToday ? 0 : habit.target);
          if (!doneToday) toast.success("Berhasil disimpan");
        }}
        disabled={!scheduledToday}
        className={cn(
          "w-full rounded-full",
          doneToday
            ? "bg-emerald-600 text-white hover:bg-emerald-700"
            : "bg-amber-600 text-white hover:bg-amber-700"
        )}
      >
        <Droplets aria-hidden />
        {!scheduledToday
          ? "Tidak terjadwal hari ini"
          : doneToday
            ? "Tersirami — batalkan"
            : "Sirami hari ini"}
      </Button>

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
    </div>
  );
}

/* ---------- Deteksi layar lebar ---------- */

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isDesktop;
}

/* ---------- Pembungkus responsif ---------- */

export function HabitDetailSheet({
  habit,
  open,
  onOpenChange,
  onEdit,
}: {
  habit: Habit | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onEdit: (h: Habit) => void;
}) {
  const isDesktop = useIsDesktop();
  if (!habit) return null;

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[88vh] overflow-y-auto rounded-3xl border-amber-100 bg-[#FBF7F0] sm:max-w-lg dark:border-stone-800 dark:bg-[#191410]">
          <DialogHeader>
            <DialogTitle>Detail kebiasaan</DialogTitle>
            <DialogDescription>
              Skor, riwayat, jadwal, dan pengingat untuk kebiasaan ini.
            </DialogDescription>
          </DialogHeader>
          <DetailBody habit={habit} onEdit={onEdit} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-h-[88vh] max-w-lg rounded-t-3xl border-amber-100 bg-[#FBF7F0] dark:border-stone-800 dark:bg-[#191410]">
        <div className="mx-auto w-full max-w-lg overflow-y-auto px-4 pb-8 pt-2">
          <DrawerHeader className="px-0 text-left">
            <DrawerTitle className="sr-only">
              Detail kebiasaan {habit.name}
            </DrawerTitle>
            <DrawerDescription className="sr-only">
              Skor, riwayat, jadwal, dan pengingat untuk kebiasaan ini.
            </DrawerDescription>
          </DrawerHeader>
          <DetailBody habit={habit} onEdit={onEdit} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
