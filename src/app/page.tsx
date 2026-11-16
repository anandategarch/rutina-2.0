"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus, Sprout } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { GardenView } from "@/components/rutina/garden-view";
import { HabitDialog } from "@/components/rutina/habit-dialog";
import { HomeView } from "@/components/rutina/home-view";
import { StatsView } from "@/components/rutina/stats-view";
import { RutinaProvider, type Habit } from "@/lib/rutina";

type Tab = "beranda" | "kebun" | "statistik";

/* ---------- Logo ---------- */

function LogoMark() {
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="flex items-center gap-2.5"
      aria-label="Rutina — kembali ke atas"
    >
      <span className="grid size-9 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm">
        <Sprout className="size-5" aria-hidden />
      </span>
      <span className="text-left leading-tight">
        <span className="block text-base font-semibold tracking-tight text-stone-900">
          Rutina
        </span>
        <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700/80">
          Kebun Kebiasaan
        </span>
      </span>
    </button>
  );
}

/* ---------- Isi aplikasi ---------- */

function Shell() {
  const [tab, setTab] = useState<Tab>("beranda");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);

  const openTanam = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (h: Habit) => {
    setEditing(h);
    setDialogOpen(true);
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-[#FBF7F0] text-stone-900">
      {/* bercak cahaya dekoratif */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-96 overflow-hidden"
      >
        <div className="absolute -top-24 left-[8%] size-80 rounded-full bg-amber-200/50 blur-3xl" />
        <div className="absolute -top-16 right-[12%] size-64 rounded-full bg-emerald-200/40 blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 border-b border-amber-100/80 bg-[#FBF7F0]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <LogoMark />

          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as Tab)}
            className="hidden md:block"
          >
            <TabsList className="rounded-full border border-amber-100 bg-white p-1">
              <TabsTrigger
                value="beranda"
                className="rounded-full px-4 data-[state=active]:bg-amber-600 data-[state=active]:text-white"
              >
                Beranda
              </TabsTrigger>
              <TabsTrigger
                value="kebun"
                className="rounded-full px-4 data-[state=active]:bg-amber-600 data-[state=active]:text-white"
              >
                Kebun
              </TabsTrigger>
              <TabsTrigger
                value="statistik"
                className="rounded-full px-4 data-[state=active]:bg-amber-600 data-[state=active]:text-white"
              >
                Statistik
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            onClick={openTanam}
            className="shrink-0 rounded-full bg-amber-600 text-white shadow-sm shadow-amber-600/20 hover:bg-amber-700"
          >
            <Plus aria-hidden /> Tanam
          </Button>
        </div>

        {/* navigasi seluler */}
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as Tab)}
          className="md:hidden"
        >
          <div className="mx-auto w-full max-w-6xl px-4 pb-2.5">
            <TabsList className="h-9 w-full justify-start gap-1 overflow-x-auto rounded-full border border-amber-100 bg-white p-1">
              <TabsTrigger
                value="beranda"
                className="shrink-0 rounded-full px-3.5 text-xs data-[state=active]:bg-amber-600 data-[state=active]:text-white"
              >
                Beranda
              </TabsTrigger>
              <TabsTrigger
                value="kebun"
                className="shrink-0 rounded-full px-3.5 text-xs data-[state=active]:bg-amber-600 data-[state=active]:text-white"
              >
                Kebun
              </TabsTrigger>
              <TabsTrigger
                value="statistik"
                className="shrink-0 rounded-full px-3.5 text-xs data-[state=active]:bg-amber-600 data-[state=active]:text-white"
              >
                Statistik
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {tab === "beranda" && (
              <HomeView onTanam={openTanam} onEdit={openEdit} />
            )}
            {tab === "kebun" && <GardenView onTanam={openTanam} />}
            {tab === "statistik" && <StatsView onTanam={openTanam} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="mt-auto border-t border-amber-100/80 bg-[#F6EFE3]">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-stone-500 sm:flex-row sm:px-6">
          <p className="flex items-center gap-2">
            <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-700">
              <Sprout className="size-3.5" aria-hidden />
            </span>
            Rutina — kebun kebiasaanmu, disirami sedikit tiap hari.
          </p>
          <p className="text-xs text-stone-400">
            Dibangun dengan shadcn/ui · Motion · anime.js
          </p>
        </div>
      </footer>

      <HabitDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
      />
    </div>
  );
}

export default function HomePage() {
  return (
    <RutinaProvider>
      <Shell />
    </RutinaProvider>
  );
}
