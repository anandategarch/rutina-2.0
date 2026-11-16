"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Minus, Plus, Save } from "lucide-react";

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
  HABIT_ICONS,
  HabitIcon,
  makeHabit,
  useRutina,
  type Category,
  type Habit,
} from "@/lib/rutina";
import { cn } from "@/lib/utils";

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
      });
    } else {
      addHabit(makeHabit({ icon, name: trimmed, category, target }));
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
                    ? "border-amber-500 bg-amber-100 text-amber-700"
                    : "border-stone-200 bg-white text-stone-400 hover:border-stone-300 hover:text-stone-500"
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
                      ? "border-amber-500 bg-amber-50 text-amber-800"
                      : "border-stone-200 text-stone-500 hover:border-stone-300"
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
            <span className="w-20 text-center text-sm font-medium text-stone-700">
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
      </div>

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
      <DialogContent className="rounded-3xl border-amber-100 sm:max-w-md">
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
