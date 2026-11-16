"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlarmClock, Minus, Plus, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  CATEGORY_META,
  DAY_SHORT,
  DEFAULT_SCHEDULE,
  HABIT_ICONS,
  HabitIcon,
  makeHabit,
  useRutina,
  type Category,
  type Habit,
} from "@/lib/rutina";
import { cn } from "@/lib/utils";

/* Urutan tampil Senin..Minggu */
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

/* ---------- Isi form — terpasang segar tiap dialog dibuka ---------- */

function HabitForm({
  editing,
  onFinish,
}: {
  editing: Habit | null;
  onFinish: () => void;
}) {
  const { addHabit, updateHabit } = useRutina();
  const [icon, setIcon] = useState(editing?.icon ?? "Droplets");
  const [name, setName] = useState(editing?.name ?? "");
  const [category, setCategory] = useState<Category>(
    editing?.category ?? "pagi"
  );
  const [target, setTarget] = useState(editing?.target ?? 1);
  const [schedule, setSchedule] = useState<number[]>(
    editing?.schedule ?? DEFAULT_SCHEDULE
  );
  const [reminder, setReminder] = useState(editing?.reminder ?? "");

  const toggleDay = (d: number) => {
    setSchedule((prev) => {
      if (prev.includes(d)) {
        const next = prev.filter((x) => x !== d);
        return next.length === 0 ? prev : next; /* minimal satu hari */
      }
      return [...prev, d].sort((a, b) => a - b);
    });
  };

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Beri nama dulu kebiasaanmu");
      return;
    }
    if (editing) {
      updateHabit(editing.id, {
        icon,
        name: trimmed,
        category,
        target,
        schedule,
        reminder: reminder || null,
      });
    } else {
      addHabit(
        makeHabit({
          icon,
          name: trimmed,
          category,
          target,
          schedule,
          reminder: reminder || null,
        })
      );
    }
    toast.success("Berhasil disimpan");
    onFinish();
  };

  return (
    <>
      <div className="space-y-5">
        <div className="space-y-2">
          <Label>Ikon</Label>
          <div className="grid grid-cols-6 gap-1.5">
            {Object.keys(HABIT_ICONS).map((k) => (
              <button
                type="button"
                key={k}
                onClick={() => setIcon(k)}
                aria-label={`Pilih ikon ${k}`}
                aria-pressed={icon === k}
                className={cn(
                  "grid aspect-square place-items-center rounded-xl border transition",
                  icon === k
                    ? "border-amber-500 bg-amber-100 text-amber-700 dark:border-amber-500/60 dark:bg-amber-500/15 dark:text-amber-300"
                    : "border-stone-200 bg-white text-stone-400 hover:border-stone-300 hover:text-stone-500 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700"
                )}
              >
                <HabitIcon name={k} className="size-4" />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="habit-name">Nama kebiasaan</Label>
          <Input
            id="habit-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="cth. Menyiram tanaman"
            className="rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <Label>Waktu</Label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CATEGORY_META) as Category[]).map((c) => {
              const meta = CATEGORY_META[c];
              return (
                <button
                  type="button"
                  key={c}
                  onClick={() => setCategory(c)}
                  aria-pressed={category === c}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition",
                    category === c
                      ? "border-amber-500 bg-amber-50 text-amber-800 dark:border-amber-500/60 dark:bg-amber-500/15 dark:text-amber-300"
                      : "border-stone-200 text-stone-500 hover:border-stone-300 dark:border-stone-800 dark:text-stone-400"
                  )}
                >
                  <meta.icon className="size-3.5" aria-hidden />
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Target per hari</Label>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-9 rounded-full"
              onClick={() => setTarget((t) => Math.max(1, t - 1))}
              aria-label="Kurangi target"
            >
              <Minus aria-hidden />
            </Button>
            <span className="w-20 text-center text-sm font-medium text-stone-700 dark:text-stone-300">
              {target} kali
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-9 rounded-full"
              onClick={() => setTarget((t) => Math.min(6, t + 1))}
              aria-label="Tambah target"
            >
              <Plus aria-hidden />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Jadwal dalam seminggu</Label>
          <div className="flex flex-wrap gap-1.5">
            {DAY_ORDER.map((d) => {
              const active = schedule.includes(d);
              return (
                <button
                  type="button"
                  key={d}
                  onClick={() => toggleDay(d)}
                  aria-pressed={active}
                  aria-label={`${DAY_SHORT[d]} ${active ? "aktif" : "nonaktif"}`}
                  className={cn(
                    "h-10 w-12 rounded-xl border text-xs font-semibold transition",
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
          <p className="text-xs text-stone-400">
            {schedule.length === 7
              ? "Aktif tiap hari."
              : `Aktif ${schedule.length}x seminggu — hari lain bebas tanpa memutus runtun.`}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="habit-reminder" className="flex items-center gap-1.5">
            <AlarmClock className="size-3.5" aria-hidden /> Pengingat (opsional)
          </Label>
          <Input
            id="habit-reminder"
            type="time"
            value={reminder}
            onChange={(e) => setReminder(e.target.value)}
            className="w-36 rounded-xl tabular-nums"
          />
        </div>
      </div>

      <div className="sticky bottom-0 -mx-6 mt-2 rounded-b-3xl border-t border-amber-100 bg-background px-6 pb-6 pt-3 dark:border-stone-800">
        <DialogFooter>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={onFinish}
          >
            Batal
          </Button>
          <Button
            onClick={submit}
            className="rounded-full bg-amber-600 text-white hover:bg-amber-700"
          >
            <Save aria-hidden />
            {editing ? "Simpan Perubahan" : "Tanam"}
          </Button>
        </DialogFooter>
      </div>
    </>
  );
}

/* ---------- Dialog ---------- */

export function HabitDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Habit | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto rounded-3xl border-amber-100 sm:max-w-md dark:border-stone-800">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Ubah kebiasaan" : "Tanam kebiasaan baru"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Sesuaikan detailnya — riwayat penyiraman tetap tersimpan."
              : "Isi detailnya, lalu tanam di kebunmu hari ini."}
          </DialogDescription>
        </DialogHeader>
        <HabitForm
          key={editing?.id ?? "baru"}
          editing={editing}
          onFinish={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
