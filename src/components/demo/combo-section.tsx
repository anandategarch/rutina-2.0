"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { animate, stagger, utils } from "animejs";
import { motion, useMotionValueEvent, useSpring } from "motion/react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

import { SectionShell } from "./shared";

import {
  Blocks,
  BookOpen,
  Droplets,
  Film,
  Flame,
  Layers,
  Moon,
  Pencil,
  RotateCcw,
  Save,
  Footprints,
  Zap,
  type LucideIcon,
} from "lucide-react";

/* ---------- Data ---------- */

type Habit = {
  id: string;
  label: string;
  sub: string;
  icon: LucideIcon;
};

const HABITS: Habit[] = [
  { id: "siram", label: "Menyiram tanaman", sub: "07.00 · Teras", icon: Droplets },
  { id: "baca", label: "Membaca 10 halaman", sub: "Sore · Ruang baca", icon: BookOpen },
  { id: "jalan", label: "Berjalan 20 menit", sub: "17.30 · Sekitar rumah", icon: Footprints },
  { id: "jurnal", label: "Menulis jurnal", sub: "21.00 · Meja belajar", icon: Pencil },
  { id: "tidur", label: "Tidur sebelum 23.00", sub: "Malam · Kamar", icon: Moon },
];

const CONFETTI_COLORS = [
  "bg-emerald-500",
  "bg-teal-500",
  "bg-amber-500",
  "bg-rose-500",
];

/* ---------- Baris kebiasaan: centang SVG via anime.js ---------- */

function HabitRow({
  habit,
  done,
  onToggle,
}: {
  habit: Habit;
  done: boolean;
  onToggle: () => void;
}) {
  const pathRef = useRef<SVGPathElement>(null);
  const mounted = useRef(false);

  useEffect(() => {
    const p = pathRef.current;
    if (!p) return;
    const len = p.getTotalLength();
    p.style.strokeDasharray = `${len}`;

    if (!mounted.current) {
      p.style.strokeDashoffset = `${len}`;
      mounted.current = true;
      if (!done) return;
    }

    const anim = animate(p, {
      strokeDashoffset: done ? 0 : len,
      duration: done ? 450 : 220,
      ease: "outQuad",
    });
    return () => {
      anim.revert();
    };
  }, [done]);

  const Icon = habit.icon;

  return (
    <motion.li
      layout
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className="list-none"
    >
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={done}
        aria-label={`${done ? "Batalkan" : "Selesaikan"}: ${habit.label}`}
        className={`group flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors ${
          done
            ? "border-emerald-200 bg-emerald-50/60"
            : "border-stone-200 bg-white hover:border-emerald-300 hover:bg-stone-50"
        }`}
      >
        <span
          className={`grid size-9 shrink-0 place-items-center rounded-full border-2 transition-colors ${
            done
              ? "border-emerald-500 bg-emerald-500 text-white"
              : "border-stone-300 text-transparent group-hover:border-emerald-400"
          }`}
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden>
            <path
              ref={pathRef}
              d="M20 6 L9 17 L4 12"
              stroke="currentColor"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={`block truncate text-sm font-medium transition-colors ${
              done ? "text-stone-400 line-through" : "text-stone-800"
            }`}
          >
            {habit.label}
          </span>
          <span className="block text-xs text-stone-400">{habit.sub}</span>
        </span>
        <Icon
          className={`size-4 shrink-0 transition-colors ${
            done ? "text-emerald-500" : "text-stone-300 group-hover:text-stone-400"
          }`}
          aria-hidden
        />
      </button>
    </motion.li>
  );
}

/* ---------- Kartu utama ---------- */

function HabitCard() {
  const [doneIds, setDoneIds] = useState<string[]>([]);
  const burstRef = useRef<HTMLDivElement>(null);

  const done = doneIds.length;
  const total = HABITS.length;
  const allDone = done === total && total > 0;

  const sorted = useMemo(
    () => [
      ...HABITS.filter((h) => !doneIds.includes(h.id)),
      ...HABITS.filter((h) => doneIds.includes(h.id)),
    ],
    [doneIds]
  );

  const toggle = (id: string) => {
    setDoneIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
    toast.success("Berhasil disimpan");
  };

  /* Angka pegas (Motion) untuk statistik */
  const doneSpring = useSpring(0, { stiffness: 90, damping: 14 });
  const poinSpring = useSpring(0, { stiffness: 90, damping: 16 });
  const [doneLabel, setDoneLabel] = useState("0");
  const [poinLabel, setPoinLabel] = useState("0");

  useMotionValueEvent(doneSpring, "change", (v) =>
    setDoneLabel(`${Math.round(v)}`)
  );
  useMotionValueEvent(poinSpring, "change", (v) =>
    setPoinLabel(Math.round(v).toLocaleString("id-ID"))
  );

  useEffect(() => {
    doneSpring.set(done);
    poinSpring.set(done * 20);
  }, [done, doneSpring, poinSpring]);

  /* Ledakan konfeti (anime.js) saat semua selesai */
  useEffect(() => {
    if (!allDone || !burstRef.current) return;
    const dots = Array.from(
      burstRef.current.querySelectorAll<HTMLElement>(".cb-dot")
    );
    if (dots.length === 0) return;

    const anims = dots.map((dot) =>
      animate(dot, {
        translateX: () => utils.random(-120, 120),
        translateY: () => utils.random(-90, 60),
        scale: [0, 1, 0.4],
        opacity: [1, 1, 0],
        duration: 1000,
        ease: "outCubic",
        delay: stagger(30),
      })
    );
    return () => {
      anims.forEach((a) => a.revert());
    };
  }, [allDone]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ type: "spring", stiffness: 80, damping: 18 }}
    >
      <Card className="relative gap-0 overflow-hidden rounded-2xl border-stone-200 py-0">
        {/* Lapisan konfeti */}
        <div
          ref={burstRef}
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-28 z-10"
        >
          {Array.from({ length: 14 }).map((_, i) => (
            <span
              key={i}
              className={`cb-dot absolute size-2 rounded-full opacity-0 will-change-transform ${
                CONFETTI_COLORS[i % CONFETTI_COLORS.length]
              }`}
            />
          ))}
        </div>

        <CardHeader className="border-b border-stone-100 px-6 py-5">
          <div className="flex items-center justify-between gap-3">
            <Badge className="bg-amber-500 hover:bg-amber-500">
              Gabungan 3 Pustaka
            </Badge>
            <span className="text-xs text-stone-400">
              Klik baris untuk menandai
            </span>
          </div>
          <CardTitle className="mt-2 text-xl">Kebiasaan Hari Ini</CardTitle>
          <CardDescription>
            Satu kartu, tiga pustaka bekerja bersama — tanpa terasa.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 px-6 py-6">
          {/* Statistik */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-center">
              <motion.span
                key={done}
                initial={{ scale: 1.3 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                className="block text-2xl font-semibold tabular-nums text-stone-900"
              >
                {doneLabel}
                <span className="text-sm font-normal text-stone-400">
                  {" "}
                  / {total}
                </span>
              </motion.span>
              <span className="mt-0.5 block text-xs text-stone-400">
                Selesai
              </span>
            </div>
            <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-center">
              <span className="flex items-center justify-center gap-1.5 text-2xl font-semibold tabular-nums text-stone-900">
                <Flame
                  className="size-5 text-amber-500"
                  aria-hidden
                />
                7
              </span>
              <span className="mt-0.5 block text-xs text-stone-400">
                Hari runtun
              </span>
            </div>
            <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-center">
              <motion.span className="block text-2xl font-semibold tabular-nums text-stone-900">
                {poinLabel}
              </motion.span>
              <span className="mt-0.5 block text-xs text-stone-400">
                Poin
              </span>
            </div>
          </div>

          {/* Progres */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-stone-700">Progres hari ini</span>
              <motion.span
                key={done}
                initial={{ scale: 1.25 }}
                animate={{ scale: 1 }}
                className="font-semibold text-emerald-700 tabular-nums"
              >
                {Math.round((done / total) * 100)}%
              </motion.span>
            </div>
            <Progress value={(done / total) * 100} className="h-2.5" />
            {allDone ? (
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs font-medium text-emerald-700"
              >
                Semua selesai — hutan kecilmu tumbuh hari ini.
              </motion.p>
            ) : (
              <p className="text-xs text-stone-400">
                {total - done} kebiasaan menunggu ditanam.
              </p>
            )}
          </div>

          <Separator />

          {/* Daftar kebiasaan */}
          <ul className="space-y-2">
            {sorted.map((h) => (
              <HabitRow
                key={h.id}
                habit={h}
                done={doneIds.includes(h.id)}
                onToggle={() => toggle(h.id)}
              />
            ))}
          </ul>
        </CardContent>

        <CardFooter className="flex flex-col gap-2 border-t border-stone-100 px-6 py-4 sm:flex-row sm:justify-between">
          <Button onClick={() => toast.success("Berhasil disimpan")}>
            <Save aria-hidden /> Simpan
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setDoneIds([]);
              toast("Demo diulang dari awal");
            }}
          >
            <RotateCcw aria-hidden /> Ulangi Demo
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

/* ---------- Kartu peran tiap pustaka ---------- */

const ROLES = [
  {
    icon: Blocks,
    name: "shadcn/ui",
    tone: "chip-emerald",
    desc: "Kartu, lencana, tombol, dan bilah progres yang kamu klik.",
  },
  {
    icon: Zap,
    name: "Motion",
    tone: "chip-teal",
    desc: "Kartu meluncur masuk, baris menyusun ulang, angka berhitung pegas.",
  },
  {
    icon: Film,
    name: "anime.js",
    tone: "chip-rose",
    desc: "Centang digambar garis demi garis, konfeti meledak saat tuntas.",
  },
] as const;

const TONES: Record<string, string> = {
  "chip-emerald": "bg-emerald-100 text-emerald-700",
  "chip-teal": "bg-teal-100 text-teal-700",
  "chip-rose": "bg-rose-100 text-rose-600",
};

function RoleCard() {
  return (
    <Card className="gap-0 rounded-2xl border-stone-200 py-0">
      <CardHeader className="border-b border-stone-100 px-5 py-4">
        <CardTitle className="text-sm">Siapa mengerjakan apa</CardTitle>
        <CardDescription className="text-xs">
          Pada kartu di sebelah kiri
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-5 py-5">
        {ROLES.map((r) => (
          <div key={r.name} className="flex items-start gap-3">
            <span
              className={`grid size-8 shrink-0 place-items-center rounded-lg ${TONES[r.tone]}`}
            >
              <r.icon className="size-4" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-stone-800">{r.name}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-stone-500">
                {r.desc}
              </p>
            </div>
          </div>
        ))}
        <Separator />
        <p className="text-xs leading-relaxed text-stone-500">
          Catatan untuk Rutina: <strong>shadcn/ui</strong> hanya bisa dipakai
          di proyek React seperti halaman ini. <strong>Motion</strong> dan{" "}
          <strong>anime.js</strong> bisa hadir di HTML statis lewat CDN —
          jadi keduanya siap dipakai di rutina.html kapan saja.
        </p>
      </CardContent>
    </Card>
  );
}

/* ---------- Seksi ---------- */

export function ComboSection() {
  return (
    <SectionShell
      id="gabungan"
      accent="amber"
      icon={Layers}
      eyebrow="Semua bersama"
      title="Gabungan — mini aplikasi kebiasaan"
      description="Skenario seperti Rutina sungguhan: tandai kebiasaan, lihat angka melompat, baris menyusun ulang, centang tergambar, dan konfeti menyambut hari yang tuntas."
    >
      <div className="grid gap-4 sm:gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <HabitCard />
        </div>
        <RoleCard />
      </div>
    </SectionShell>
  );
}
