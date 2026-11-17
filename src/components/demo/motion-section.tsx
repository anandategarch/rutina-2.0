"use client";

import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useSpring,
  type Variants,
} from "motion/react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { DemoCard, SectionShell } from "./shared";

import {
  Grip,
  LayoutGrid,
  Leaf,
  List,
  Magnet,
  Plus,
  RotateCw,
  Sparkles,
  X,
  Zap,
} from "lucide-react";

/* ---------- 1. Kartu pegas: hover dengan fisika pegas ---------- */

function SpringCardDemo() {
  return (
    <div className="grid place-items-center py-2">
      <motion.div
        whileHover={{ scale: 1.05, y: -8 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 320, damping: 16 }}
        className="relative w-56 cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 p-5 text-white shadow-lg shadow-emerald-500/25"
      >
        <div className="absolute -right-6 -top-6 size-24 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 -left-8 size-28 rounded-full bg-lime-300/20" />
        <Leaf className="size-8" aria-hidden />
        <p className="mt-6 text-lg font-semibold leading-tight">
          Kartu Pegas
        </p>
        <p className="mt-1 text-xs leading-relaxed text-emerald-50/90">
          Arahkan kursor — terasa seperti menekan bantal. whileHover +
          transisi pegas.
        </p>
      </motion.div>
    </div>
  );
}

/* ---------- 2. Tata letak dinamis: susun ulang dengan animasi ---------- */

const LAYOUT_ITEMS = [
  { id: 1, label: "Pagi", value: "5 kebiasaan", icon: Sparkles },
  { id: 2, label: "Siang", value: "3 kebiasaan", icon: Leaf },
  { id: 3, label: "Malam", value: "4 kebiasaan", icon: Grip },
];

function LayoutDemo() {
  const [view, setView] = useState<"grid" | "list">("grid");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-stone-400">
          Induk berubah kelas, anak-anak meluncur mulus.
        </p>
        <div className="flex items-center gap-1 rounded-lg border border-stone-200 p-0.5">
          <Button
            size="sm"
            variant={view === "grid" ? "secondary" : "ghost"}
            className="h-7 px-2"
            onClick={() => setView("grid")}
            aria-label="Tampilan kisi"
          >
            <LayoutGrid aria-hidden />
          </Button>
          <Button
            size="sm"
            variant={view === "list" ? "secondary" : "ghost"}
            className="h-7 px-2"
            onClick={() => setView("list")}
            aria-label="Tampilan daftar"
          >
            <List aria-hidden />
          </Button>
        </div>
      </div>

      <motion.div
        layout
        className={
          view === "grid"
            ? "grid grid-cols-3 gap-2.5"
            : "flex flex-col gap-2.5"
        }
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
      >
        {LAYOUT_ITEMS.map((it) => (
          <motion.div
            key={it.id}
            layout
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3"
          >
            <span
              className={`grid shrink-0 place-items-center rounded-lg bg-emerald-100 p-1.5 text-emerald-700 ${
                view === "grid" ? "" : "size-8"
              }`}
            >
              <it.icon className="size-4" aria-hidden />
            </span>
            <span className={view === "grid" ? "" : "flex-1"}>
              <span className="block text-sm font-medium leading-tight">
                {it.label}
              </span>
              <span className="block text-xs text-stone-400">{it.value}</span>
            </span>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

/* ---------- 3. Seret stiker ---------- */

function DragDemo() {
  const boxRef = useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-3">
      <div
        ref={boxRef}
        className="relative h-44 overflow-hidden rounded-xl border border-dashed border-teal-300 bg-teal-50/50"
      >
        <p className="absolute left-3 top-2.5 text-xs font-medium text-teal-700/70">
          Seret stikernya — ia memantul pada batas.
        </p>
        <motion.div
          drag
          dragConstraints={boxRef}
          dragElastic={0.25}
          dragTransition={{ bounceStiffness: 420, bounceDamping: 22 }}
          whileDrag={{ scale: 1.15, rotate: 8 }}
          whileHover={{ scale: 1.05 }}
          className="absolute left-[calc(50%-30px)] top-[calc(50%-30px)] grid size-[60px] cursor-grab touch-none place-items-center rounded-full bg-gradient-to-br from-teal-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/30 active:cursor-grabbing"
          aria-label="Stiker yang dapat diseret"
          role="button"
          tabIndex={0}
        >
          <Leaf className="size-7" aria-hidden />
        </motion.div>
      </div>
      <p className="text-xs text-stone-400">
        drag + dragConstraints + pantulan pegas — layak sentuh juga.
      </p>
    </div>
  );
}

/* ---------- 4. Daftar bertahap ---------- */

const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 260, damping: 20 },
  },
};

const STAGGER_ITEMS = [
  "Menyiram tanaman",
  "Membaca 10 halaman",
  "Berjalan 20 menit",
  "Menulis jurnal",
  "Tidur sebelum 23.00",
];

function StaggerDemo() {
  const [run, setRun] = useState(0);

  return (
    <div className="space-y-3">
      <motion.ul
        key={run}
        variants={listVariants}
        initial="hidden"
        animate="show"
        className="space-y-2"
      >
        {STAGGER_ITEMS.map((label, i) => (
          <motion.li
            key={label}
            variants={itemVariants}
            className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-3.5 py-2.5"
          >
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-teal-100 text-[11px] font-semibold text-teal-700">
              {i + 1}
            </span>
            <span className="text-sm">{label}</span>
          </motion.li>
        ))}
      </motion.ul>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setRun((r) => r + 1)}
      >
        <RotateCw aria-hidden /> Putar ulang
      </Button>
    </div>
  );
}

/* ---------- 5. Penghitung pegas ---------- */

function CounterDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [target, setTarget] = useState(1250);
  const [text, setText] = useState("0");
  const spring = useSpring(0, { stiffness: 55, damping: 16 });

  useMotionValueEvent(spring, "change", (v) =>
    setText(Math.round(v).toLocaleString("id-ID"))
  );

  useEffect(() => {
    if (inView) spring.set(target);
  }, [inView, spring, target]);

  return (
    <div ref={ref} className="space-y-4 text-center">
      <div>
        <span className="block text-5xl font-semibold tracking-tight text-stone-900 tabular-nums">
          {text}
        </span>
        <p className="mt-1 text-xs text-stone-400">
          Poin konsistensi — berhitung saat masuk layar
        </p>
      </div>
      <div className="flex justify-center gap-2">
        <Button size="sm" variant="outline" onClick={() => setTarget((t) => t + 250)}>
          <Plus aria-hidden /> Tambah 250
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setTarget(1250)}
        >
          <RotateCw aria-hidden /> Reset
        </Button>
      </div>
      <p className="text-xs text-stone-400">
        useSpring + useTransform — angka meluncur, bukan melompat.
      </p>
    </div>
  );
}

/* ---------- 6. Tombol magnetik ---------- */

function MagneticDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 16 });
  const sy = useSpring(y, { stiffness: 220, damping: 16 });

  return (
    <div className="space-y-3">
      <div
        ref={ref}
        className="grid h-40 place-items-center rounded-xl border border-stone-200 bg-stone-50"
        onMouseMove={(e) => {
          const r = ref.current?.getBoundingClientRect();
          if (!r) return;
          x.set((e.clientX - (r.left + r.width / 2)) * 0.35);
          y.set((e.clientY - (r.top + r.height / 2)) * 0.35);
        }}
        onMouseLeave={() => {
          x.set(0);
          y.set(0);
        }}
      >
        <motion.div style={{ x: sx, y: sy }}>
          <Button size="lg" className="pointer-events-none gap-2 shadow-md">
            <Magnet aria-hidden /> Tombol Magnetik
          </Button>
        </motion.div>
      </div>
      <p className="text-xs text-stone-400">
        Gerakkan kursor di dalam kotak — tombol mengejar dengan pegas.
      </p>
    </div>
  );
}

/* ---------- 7. Hadir dan pergi (AnimatePresence) ---------- */

function PresenceDemo() {
  const [show, setShow] = useState(true);

  return (
    <div className="space-y-4">
      <div className="grid h-40 place-items-center rounded-xl border border-stone-200 bg-stone-50">
        <AnimatePresence initial={false} mode="popLayout">
          {show ? (
            <motion.div
              key="kartu"
              initial={{ opacity: 0, scale: 0.7, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.6, y: -24, rotate: -6 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className="flex w-56 flex-col items-center gap-2 rounded-2xl border border-teal-200 bg-white p-5 shadow-md"
            >
              <span className="grid size-10 place-items-center rounded-full bg-teal-100 text-teal-700">
                <Sparkles aria-hidden />
              </span>
              <p className="text-sm font-semibold">Kartu Musiman</p>
              <Badge variant="secondary" className="text-[10px]">
                muncul & pergi mulus
              </Badge>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
      <Button
        size="sm"
        variant={show ? "outline" : "default"}
        onClick={() => setShow((s) => !s)}
      >
        {show ? (
          <>
            <X aria-hidden /> Sembunyikan
          </>
        ) : (
          <>
            <Plus aria-hidden /> Munculkan
          </>
        )}
      </Button>
    </div>
  );
}

/* ---------- Seksi ---------- */

export function MotionSection() {
  return (
    <SectionShell
      id="motion"
      accent="teal"
      icon={Zap}
      eyebrow="Pustaka 2 dari 3"
      title="Motion — gerak bertenaga pegas"
      description="Animasi deklaratif untuk React: pegas fisik, tata letak yang menyusun diri sendiri, seret-lepas, dan angka yang berhitung. Bilah progres tipis di paling atas halaman ini juga digerakkan oleh Motion."
    >
      <div className="grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
        <DemoCard title="Kartu Pegas" hint="whileHover + pegas">
          <SpringCardDemo />
        </DemoCard>
        <DemoCard title="Tata Letak Dinamis" hint="prop layout">
          <LayoutDemo />
        </DemoCard>
        <DemoCard title="Seret Stiker" hint="drag + pantulan">
          <DragDemo />
        </DemoCard>
        <DemoCard title="Daftar Bertahap" hint="staggerChildren">
          <StaggerDemo />
        </DemoCard>
        <DemoCard title="Penghitung Pegas" hint="useSpring + useInView">
          <CounterDemo />
        </DemoCard>
        <DemoCard title="Tombol Magnetik" hint="motion value mengikuti kursor">
          <MagneticDemo />
        </DemoCard>
        <DemoCard
          title="Hadir & Pergi"
          hint="AnimatePresence"
          className="md:col-span-2 xl:col-span-1"
        >
          <PresenceDemo />
        </DemoCard>
      </div>
    </SectionShell>
  );
}
