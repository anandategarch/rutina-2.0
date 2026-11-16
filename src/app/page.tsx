"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import {
  BarChart3,
  Flower2,
  Home,
  Plus,
  Settings,
  Sprout,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { GardenView } from "@/components/rutina/garden-view";
import { HabitDetailSheet } from "@/components/rutina/habit-detail-sheet";
import { HabitDialog } from "@/components/rutina/habit-dialog";
import { HomeView } from "@/components/rutina/home-view";
import { SettingsView } from "@/components/rutina/settings-view";
import { StatsView } from "@/components/rutina/stats-view";
import {
  RutinaProvider,
  hhmmNow,
  isDone,
  todayKey,
  useRutina,
  type Habit,
} from "@/lib/rutina";
import { cn } from "@/lib/utils";

type Tab = "beranda" | "kebun" | "statistik" | "profil";

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "beranda", label: "Beranda", icon: Home },
  { id: "kebun", label: "Kebun", icon: Flower2 },
  { id: "statistik", label: "Statistik", icon: BarChart3 },
  { id: "profil", label: "Profil", icon: Settings },
];

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
        <span className="block text-base font-semibold tracking-tight text-stone-900 dark:text-stone-50">
          Rutina
        </span>
        <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700/80 dark:text-amber-400/80">
          Kebun Kebiasaan
        </span>
      </span>
    </button>
  );
}

/* ---------- Navigasi bawah seluler ---------- */

function BottomNav({
  tab,
  onTab,
  onTanam,
}: {
  tab: Tab;
  onTab: (t: Tab) => void;
  onTanam: () => void;
}) {
  const left = TABS.slice(0, 2);
  const right = TABS.slice(2);

  const TabButton = ({ t }: { t: (typeof TABS)[number] }) => {
    const active = tab === t.id;
    return (
      <button
        type="button"
        onClick={() => onTab(t.id)}
        aria-current={active ? "page" : undefined}
        className="relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 pt-1"
      >
        {active && (
          <motion.span
            layoutId="nav-pill"
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="absolute top-0.5 h-1 w-8 rounded-full bg-amber-500"
          />
        )}
        <t.icon
          className={cn(
            "size-5 transition-colors",
            active
              ? "text-amber-600 dark:text-amber-400"
              : "text-stone-400 dark:text-stone-500"
          )}
          aria-hidden
        />
        <span
          className={cn(
            "text-[10px] font-semibold transition-colors",
            active
              ? "text-amber-700 dark:text-amber-300"
              : "text-stone-400 dark:text-stone-500"
          )}
        >
          {t.label}
        </span>
        <span className="sr-only">{active ? "(aktif)" : ""}</span>
      </button>
    );
  };

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-amber-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden dark:border-stone-800 dark:bg-stone-950/95"
    >
      <div className="grid grid-cols-5 items-end">
        {left.map((t) => (
          <TabButton key={t.id} t={t} />
        ))}

        {/* tombol tanam di tengah */}
        <div className="relative flex justify-center">
          <motion.button
            type="button"
            whileTap={{ scale: 0.88 }}
            onClick={onTanam}
            aria-label="Tanam kebiasaan baru"
            className="-mt-5 grid size-14 place-items-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-600/30 ring-4 ring-white dark:ring-stone-950"
          >
            <Plus className="size-6" aria-hidden />
          </motion.button>
        </div>

        {right.map((t) => (
          <TabButton key={t.id} t={t} />
        ))}
      </div>
    </nav>
  );
}

/* ---------- Pengingat selagi aplikasi terbuka ---------- */

function useReminders(enabled: boolean) {
  const { habits } = useRutina();
  const fired = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled) return;
    const tick = () => {
      const now = hhmmNow();
      const tk = todayKey();
      for (const h of habits) {
        if (!h.reminder || h.reminder !== now) continue;
        const stamp = `${tk}|${now}|${h.id}`;
        if (fired.current.has(stamp)) continue;
        if (isDone(h, tk)) continue;
        fired.current.add(stamp);
        const msg = `Waktunya ${h.name} — siram kebunmu sedikit hari ini.`;
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          try {
            new Notification("Rutina", { body: msg });
          } catch {
            /* abaikan bila peramban menolak */
          }
        }
        toast(`Pengingat: ${h.name}`, { description: msg, duration: 8000 });
      }
    };
    tick();
    const id = window.setInterval(tick, 20000);
    return () => window.clearInterval(id);
  }, [habits, enabled]);
}

/* ---------- Isi aplikasi ---------- */

function Shell() {
  const [tab, setTab] = useState<Tab>("beranda");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [detail, setDetail] = useState<Habit | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { habits } = useRutina();
  useReminders(habits.length > 0);

  const openTanam = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (h: Habit) => {
    setDetailOpen(false);
    setEditing(h);
    setDialogOpen(true);
  };

  const openDetail = (h: Habit) => {
    setDetail(h);
    setDetailOpen(true);
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-[#FBF7F0] text-stone-900 dark:bg-[#171209] dark:text-stone-100">
      {/* bercak cahaya dekoratif */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-96 overflow-hidden"
      >
        <div className="absolute -top-24 left-[8%] size-80 rounded-full bg-amber-200/50 blur-3xl dark:bg-amber-500/10" />
        <div className="absolute -top-16 right-[12%] size-64 rounded-full bg-emerald-200/40 blur-3xl dark:bg-emerald-500/10" />
      </div>

      <header className="sticky top-0 z-40 border-b border-amber-100/80 bg-[#FBF7F0]/90 backdrop-blur-md dark:border-stone-800/80 dark:bg-[#171209]/90">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <LogoMark />

          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as Tab)}
            className="hidden md:block"
          >
            <TabsList className="rounded-full border border-amber-100 bg-white p-1 dark:border-stone-800 dark:bg-stone-900">
              {TABS.map((t) => (
                <TabsTrigger
                  key={t.id}
                  value={t.id}
                  className="rounded-full px-4 data-[state=active]:bg-amber-600 data-[state=active]:text-white dark:data-[state=active]:bg-amber-600"
                >
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <Button
            onClick={openTanam}
            className="hidden shrink-0 rounded-full bg-amber-600 text-white shadow-sm shadow-amber-600/20 hover:bg-amber-700 md:inline-flex"
          >
            <Plus aria-hidden /> Tanam
          </Button>

          {/* di layar kecil, tanam lewat tombol + di navigasi bawah */}
          <span className="md:hidden" aria-hidden />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 sm:px-6 sm:pt-10 md:pb-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {tab === "beranda" && (
              <HomeView onTanam={openTanam} onDetail={openDetail} />
            )}
            {tab === "kebun" && (
              <GardenView onTanam={openTanam} onDetail={openDetail} />
            )}
            {tab === "statistik" && (
              <StatsView onTanam={openTanam} onDetail={openDetail} />
            )}
            {tab === "profil" && <SettingsView />}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="mt-auto hidden border-t border-amber-100/80 bg-[#F6EFE3] md:block dark:border-stone-800/80 dark:bg-[#120E08]">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-stone-500 sm:flex-row sm:px-6 dark:text-stone-400">
          <p className="flex items-center gap-2">
            <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              <Sprout className="size-3.5" aria-hidden />
            </span>
            Rutina — kebun kebiasaanmu, disirami sedikit tiap hari.
          </p>
          <p className="text-xs text-stone-400 dark:text-stone-500">
            Dibangun dengan shadcn/ui · Motion · anime.js
          </p>
        </div>
      </footer>

      {/* navigasi bawah seluler */}
      <BottomNav tab={tab} onTab={setTab} onTanam={openTanam} />

      <HabitDetailSheet
        habit={detail}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={openEdit}
      />

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
