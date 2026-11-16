"use client";

import { motion, useScroll, useSpring, type Variants } from "motion/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { AnimeSection } from "@/components/demo/anime-section";
import { ComboSection } from "@/components/demo/combo-section";
import { MotionSection } from "@/components/demo/motion-section";
import { ShadcnSection } from "@/components/demo/shadcn-section";

import {
  ArrowDown,
  ArrowUpRight,
  Blocks,
  Film,
  Leaf,
  Zap,
} from "lucide-react";

/* ---------- Bilah progres gulir (Motion) ---------- */

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 24,
    mass: 0.4,
  });

  return (
    <motion.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[70] h-1 origin-left bg-gradient-to-r from-emerald-500 via-teal-500 to-lime-500"
      style={{ scaleX }}
    />
  );
}

/* ---------- Tajuk lengket ---------- */

const NAV = [
  { href: "#shadcn", label: "shadcn/ui" },
  { href: "#motion", label: "Motion" },
  { href: "#animejs", label: "anime.js" },
  { href: "#gabungan", label: "Gabungan" },
];

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-stone-200/70 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <a
          href="#atas"
          className="flex items-center gap-2.5"
          aria-label="Kembali ke atas"
        >
          <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
            <Leaf className="size-4" aria-hidden />
          </span>
          <span className="text-sm font-semibold tracking-tight text-stone-900">
            Studio Komponen
          </span>
        </a>

        <nav
          aria-label="Navigasi bagian"
          className="hidden items-center gap-1 md:flex"
        >
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="rounded-lg px-3 py-1.5 text-sm text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900"
            >
              {n.label}
            </a>
          ))}
        </nav>

        <Button variant="outline" size="sm" className="shrink-0" asChild>
          <a href="/lab.html" target="_blank" rel="noreferrer">
            Lab CSS <ArrowUpRight aria-hidden />
          </a>
        </Button>
      </div>

      {/* Navigasi seluler */}
      <nav
        aria-label="Navigasi bagian (seluler)"
        className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden"
      >
        {NAV.map((n) => (
          <a
            key={n.href}
            href={n.href}
            className="shrink-0 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs text-stone-600"
          >
            {n.label}
          </a>
        ))}
      </nav>
    </header>
  );
}

/* ---------- Pahlawan (hero) ---------- */

const heroVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.11, delayChildren: 0.08 } },
};

const heroItem: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 110, damping: 16 },
  },
};

const LIBRARIES = [
  {
    icon: Blocks,
    name: "shadcn/ui",
    version: "50+ komponen",
    role: "Kerangka antarmuka — kartu, tombol, dialog, form.",
    chip: "bg-emerald-100 text-emerald-700",
  },
  {
    icon: Zap,
    name: "Motion",
    version: "v14.14.0",
    role: "Gerak bertenaga pegas — fisika, bukan durasi.",
    chip: "bg-teal-100 text-teal-700",
  },
  {
    icon: Film,
    name: "anime.js",
    version: "v4.5.0",
    role: "Koreografi presisi — lini masa, stagger, SVG.",
    chip: "bg-rose-100 text-rose-600",
  },
];

function Hero() {
  return (
    <section
      id="atas"
      className="relative overflow-hidden bg-gradient-to-b from-emerald-50/90 via-white to-white"
    >
      <div
        aria-hidden
        className="absolute -top-24 left-1/2 size-[520px] -translate-x-1/2 rounded-full bg-emerald-200/30 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -right-24 top-32 size-64 rounded-full bg-teal-200/30 blur-3xl"
      />

      <motion.div
        variants={heroVariants}
        initial="hidden"
        animate="show"
        className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pb-20 sm:pt-24"
      >
        <motion.div variants={heroItem}>
          <Badge
            variant="outline"
            className="gap-1.5 border-emerald-300/70 bg-white px-3 py-1 text-emerald-700"
          >
            Demo interaktif — semuanya bisa diklik
          </Badge>
        </motion.div>

        <motion.h1
          variants={heroItem}
          className="mx-auto mt-5 max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight text-stone-900 sm:text-5xl md:text-6xl"
        >
          Satu halaman,{" "}
          <span className="bg-gradient-to-r from-emerald-700 via-teal-600 to-lime-600 bg-clip-text text-transparent">
            tiga pustaka
          </span>{" "}
          bekerja bersama.
        </motion.h1>

        <motion.p
          variants={heroItem}
          className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-stone-500 sm:text-lg"
        >
          Halaman ini dibangun dengan shadcn/ui sebagai kerangka, Motion
          untuk gerak berpegas, dan anime.js untuk koreografi detail —
          dijalankan langsung di Next.js tanpa satu baris CSS kustom pun.
        </motion.p>

        <motion.div
          variants={heroItem}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <Button size="lg" className="h-11" asChild>
            <a href="#shadcn">
              Mulai jelajahi <ArrowDown aria-hidden />
            </a>
          </Button>
          <Button size="lg" variant="outline" className="h-11" asChild>
            <a href="/rutina.html" target="_blank" rel="noreferrer">
              Buka Rutina <ArrowUpRight aria-hidden />
            </a>
          </Button>
        </motion.div>

        <motion.div
          variants={heroItem}
          className="mx-auto mt-14 grid max-w-4xl gap-4 text-left sm:grid-cols-3"
        >
          {LIBRARIES.map((lib) => (
            <div
              key={lib.name}
              className="group rounded-2xl border border-stone-200 bg-white/80 p-5 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`grid size-10 place-items-center rounded-xl ${lib.chip}`}
                >
                  <lib.icon className="size-5" aria-hidden />
                </span>
                <span className="font-mono text-[11px] text-stone-400">
                  {lib.version}
                </span>
              </div>
              <p className="mt-4 font-semibold tracking-tight text-stone-900">
                {lib.name}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-stone-500">
                {lib.role}
              </p>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ---------- Kaki halaman ---------- */

function Footer() {
  return (
    <footer className="mt-auto border-t border-stone-200 bg-stone-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-stone-500 sm:flex-row sm:px-6">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
            <Leaf className="size-3.5" aria-hidden />
          </span>
          <span>
            Studio Komponen — demo{" "}
            <span className="font-medium text-stone-700">
              Motion + anime.js + shadcn/ui
            </span>
          </span>
        </div>
        <nav
          aria-label="Tautan eksternal"
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2"
        >
          <a
            href="/lab.html"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-emerald-700"
          >
            Lab CSS Rutina
          </a>
          <a
            href="/rutina.html"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-emerald-700"
          >
            Aplikasi Rutina
          </a>
          <a
            href="https://motion.dev"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 transition-colors hover:text-emerald-700"
          >
            motion.dev <ArrowUpRight className="size-3.5" aria-hidden />
          </a>
          <a
            href="https://animejs.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 transition-colors hover:text-emerald-700"
          >
            animejs.com <ArrowUpRight className="size-3.5" aria-hidden />
          </a>
          <a
            href="https://ui.shadcn.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 transition-colors hover:text-emerald-700"
          >
            ui.shadcn.com <ArrowUpRight className="size-3.5" aria-hidden />
          </a>
        </nav>
      </div>
    </footer>
  );
}

/* ---------- Halaman ---------- */

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-stone-900">
      <ScrollProgress />
      <Header />
      <main className="flex-1">
        <Hero />
        <ShadcnSection />
        <MotionSection />
        <AnimeSection />
        <ComboSection />
      </main>
      <Footer />
    </div>
  );
}
