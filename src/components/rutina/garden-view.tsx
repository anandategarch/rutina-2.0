"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Droplets,
  Flame,
  Plus,
  Sprout,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
  CATEGORY_META,
  NEXT_STAGE_AT,
  STAGE_LABEL,
  isDone,
  plantStage,
  streakOf,
  todayKey,
  useRutina,
  type Habit,
} from "@/lib/rutina";
import { cn } from "@/lib/utils";
import { Droplets as DropletBurst, IconChip, PlantSVG } from "./bits";

/* ---------- Kartu tanaman ---------- */

function PlantCard({ habit }: { habit: Habit }) {
  const { incrementToday } = useRutina();
  const tk = todayKey();
  const done = isDone(habit, tk);
  const streak = streakOf(habit);
  const stage = plantStage(streak);
  const flower = CATEGORY_META[habit.category].flower;
  const [burst, setBurst] = useState(0);

  const water = () => {
    if (done) return;
    incrementToday(habit.id);
    setBurst((b) => b + 1);
    toast.success("Berhasil disimpan");
  };

  const nextIn =
    stage < 3 ? Math.max(0, (NEXT_STAGE_AT[stage] ?? 0) - streak) : null;

  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="h-full"
    >
      <Card className="h-full gap-0 overflow-hidden rounded-3xl border-amber-100 py-0">
        <div className="relative grid place-items-center bg-gradient-to-b from-amber-50/80 to-white px-6 pb-2 pt-8">
          <DropletBurst burstKey={burst} />
          <Badge className="absolute left-4 top-4 border border-amber-200/70 bg-white/85 text-stone-600 shadow-none">
            {STAGE_LABEL[stage]}
          </Badge>
          <PlantSVG
            stage={stage}
            flower={flower}
            drawKey={habit.id}
            className="h-44 w-44"
          />
        </div>
        <CardContent className="px-5 pb-5 pt-4">
          <div className="flex items-center gap-3">
            <IconChip
              icon={habit.icon}
              category={habit.category}
              done={done}
              className="size-9 rounded-xl"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-stone-800">
                {habit.name}
              </p>
              <p className="text-xs text-stone-400">
                {streak >= 2 ? (
                  <span className="inline-flex items-center gap-1 text-amber-600">
                    <Flame className="size-3" aria-hidden />
                    {streak} hari beruntun
                  </span>
                ) : (
                  "Belum beruntun"
                )}
              </p>
            </div>
          </div>

          <Button
            onClick={water}
            disabled={done}
            variant="outline"
            className={cn(
              "mt-4 w-full rounded-xl",
              done
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                : "border-teal-300 text-teal-700 hover:bg-teal-50 hover:text-teal-800"
            )}
          >
            {done ? (
              <>
                <CheckCircle2 aria-hidden /> Tersirami hari ini
              </>
            ) : (
              <>
                <Droplets aria-hidden /> Sirami
              </>
            )}
          </Button>

          {nextIn !== null && (
            <p className="mt-2 text-center text-xs text-stone-400">
              {nextIn === 0
                ? "Tuntas lagi hari ini untuk naik tahap"
                : `${nextIn} hari lagi menuju ${STAGE_LABEL[stage + 1]}`}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ---------- View utama ---------- */

export function GardenView({ onTanam }: { onTanam: () => void }) {
  const { ready, habits } = useRutina();

  if (!ready) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-80 rounded-3xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">
          Kebun
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
          Tanamanmu tumbuh mengikuti runtun
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">
          Dua hari beruntun ia bertunas, lima hari ia tumbuh, sepuluh hari ia
          mekar. Sirami tiap tanaman lewat tombolnya — atau tandai dari
          Beranda.
        </p>
      </div>

      {habits.length === 0 ? (
        <Card className="rounded-3xl border-amber-100">
          <CardHeader className="px-6 pt-6">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sprout className="size-5 text-amber-600" aria-hidden />
              Belum ada yang ditanam
            </CardTitle>
            <CardDescription>
              Kebun mulai hidup begitu kebiasaan pertama ditanam.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <Button
              onClick={onTanam}
              className="rounded-full bg-amber-600 text-white hover:bg-amber-700"
            >
              <Plus aria-hidden /> Tanam kebiasaan pertama
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {habits.map((h) => (
            <PlantCard key={h.id} habit={h} />
          ))}
        </div>
      )}
    </div>
  );
}
