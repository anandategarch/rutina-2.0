"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  AlarmClock,
  Bell,
  BellRing,
  Download,
  Info,
  Leaf,
  Moon,
  ShieldCheck,
  Sprout,
  Sun,
  Trash2,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

import {
  CATEGORY_META,
  DAY_SHORT,
  useRutina,
  type Habit,
} from "@/lib/rutina";
import { cn } from "@/lib/utils";
import { IconChip } from "./bits";

/* ---------- Ekspor CSV ---------- */

function exportCsv(habits: Habit[]) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const rows: string[] = [
    ["Kebiasaan", "Kategori", "Target", "Jadwal", "Pengingat", "Tanggal", "Jumlah"].join(","),
  ];
  for (const h of habits) {
    const sched = [...h.schedule]
      .sort((a, b) => a - b)
      .map((d) => DAY_SHORT[d])
      .join(" ");
    for (const [key, count] of Object.entries(h.history).sort()) {
      rows.push(
        [
          esc(h.name),
          esc(CATEGORY_META[h.category].label),
          `${h.target}`,
          esc(sched),
          h.reminder ?? "",
          key,
          `${count}`,
        ].join(",")
      );
    }
  }
  const blob = new Blob([`\uFEFF${rows.join("\n")}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `rutina-kebun-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("Ekspor CSV berhasil diunduh");
}

/* ---------- Item setelan ---------- */

function SettingRow({
  icon: Icon,
  title,
  desc,
  children,
}: {
  icon: typeof Bell;
  title: string;
  desc: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">
            {title}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-stone-400">
            {desc}
          </p>
        </div>
      </div>
      {children}
    </div>
  );
}

/* ---------- View utama ---------- */

export function SettingsView() {
  const { ready, habits, resetAll } = useRutina();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [permission, setPermission] = useState<
    "unsupported" | "default" | "granted" | "denied"
  >("unsupported");

  useEffect(() => {
    const id = window.setTimeout(() => {
      setMounted(true);
      if (typeof Notification !== "undefined") {
        setPermission(Notification.permission);
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const withReminder = useMemo(
    () => habits.filter((h) => h.reminder),
    [habits]
  );
  const historyCount = useMemo(
    () =>
      habits.reduce((s, h) => s + Object.keys(h.history).length, 0),
    [habits]
  );

  const askPermission = async () => {
    if (typeof Notification === "undefined") return;
    try {
      const p = await Notification.requestPermission();
      setPermission(p);
      if (p === "granted") {
        new Notification("Rutina", {
          body: "Pengingat kebiasaan siap menyala di jamnya.",
        });
        toast.success("Notifikasi diizinkan");
      } else {
        toast.error("Notifikasi ditolak peramban");
      }
    } catch {
      toast.error("Gagal meminta izin notifikasi");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">
          Profil
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl dark:text-stone-50">
          Pengaturan kebun
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          Tampilan, pengingat, dan data kebunmu — semuanya tersimpan di
          perangkat ini sendiri.
        </p>
      </div>

      {/* tampilan */}
      <Card className="gap-0 rounded-3xl border-amber-100 py-0 dark:border-stone-800">
        <CardHeader className="px-5 pt-6 sm:px-6">
          <CardTitle className="text-base">Tampilan</CardTitle>
          <CardDescription>Nyaman dipakai pagi ataupun tengah malam</CardDescription>
        </CardHeader>
        <CardContent className="px-5 pb-6 sm:px-6">
          <SettingRow
            icon={resolvedTheme === "dark" ? Moon : Sun}
            title="Mode malam"
            desc="Saklar tema hangat gelap — terinspirasi night mode Loop Habit Tracker."
          >
            <Switch
              checked={mounted ? resolvedTheme === "dark" : false}
              onCheckedChange={(v) => setTheme(v ? "dark" : "light")}
              aria-label="Mode malam"
              className="data-[state=checked]:bg-amber-600"
            />
          </SettingRow>
        </CardContent>
      </Card>

      {/* pengingat */}
      <Card className="gap-0 rounded-3xl border-amber-100 py-0 dark:border-stone-800">
        <CardHeader className="px-5 pt-6 sm:px-6">
          <CardTitle className="text-base">Pengingat</CardTitle>
          <CardDescription>
            Atur jam pengingat di halaman detail tiap kebiasaan; izinkan
            notifikasi agar muncul saat aplikasi terbuka.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-5 pb-6 sm:px-6">
          <SettingRow
            icon={permission === "granted" ? BellRing : Bell}
            title="Notifikasi peramban"
            desc={
              permission === "unsupported"
                ? "Peramban ini tidak mendukung notifikasi."
                : permission === "granted"
                  ? "Diizinkan — pengingat akan menyala tepat waktu."
                  : "Perlu izin untuk menampilkan pengingat."
            }
          >
            {permission === "granted" ? (
              <Badge className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                Aktif
              </Badge>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 rounded-full"
                onClick={askPermission}
                disabled={permission === "unsupported" || permission === "denied"}
              >
                Izinkan
              </Button>
            )}
          </SettingRow>

          {withReminder.length > 0 && (
            <>
              <Separator className="bg-stone-200/70 dark:bg-stone-800" />
              <ul className="space-y-2">
                {withReminder.map((h) => (
                  <li
                    key={h.id}
                    className="flex items-center gap-3 rounded-2xl border border-stone-200/80 bg-white px-3.5 py-2.5 dark:border-stone-800 dark:bg-stone-900"
                  >
                    <IconChip
                      icon={h.icon}
                      category={h.category}
                      className="size-8 rounded-lg"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm text-stone-700 dark:text-stone-200">
                      {h.name}
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                      <AlarmClock className="size-3" aria-hidden />
                      {h.reminder}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      {/* data */}
      <Card className="gap-0 rounded-3xl border-amber-100 py-0 dark:border-stone-800">
        <CardHeader className="px-5 pt-6 sm:px-6">
          <CardTitle className="text-base">Data kebun</CardTitle>
          <CardDescription>
            {ready
              ? `${habits.length} kebiasaan · ${historyCount} catatan siraman tersimpan`
              : "Memuat…"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-5 pb-6 sm:px-6">
          <SettingRow
            icon={Download}
            title="Ekspor ke CSV"
            desc="Buka di Excel atau Google Sheets untuk analisis sendiri — seperti fitur ekspor Loop."
          >
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 rounded-full"
              onClick={() => {
                if (habits.length === 0) {
                  toast.error("Belum ada data untuk diekspor");
                  return;
                }
                exportCsv(habits);
              }}
            >
              Unduh
            </Button>
          </SettingRow>

          <Separator className="bg-stone-200/70 dark:bg-stone-800" />

          <SettingRow
            icon={Trash2}
            title="Mulai ulang kebun"
            desc="Hapus semua kebiasaan dan riwayatnya. Tindakan ini tak bisa diurungkan."
          >
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 rounded-full border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-900 dark:hover:bg-rose-950/40"
                >
                  Reset
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-3xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Cabut seluruh kebun?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Semua kebiasaan ({habits.length}) beserta riwayatnya akan
                    dihapus permanen dari perangkat ini. Pertimbangkan ekspor
                    CSV dulu.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-full">
                    Batal
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      resetAll();
                      toast.success("Kebun dimulai ulang");
                    }}
                    className="rounded-full bg-rose-600 hover:bg-rose-700"
                  >
                    Ya, hapus semua
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </SettingRow>
        </CardContent>
      </Card>

      {/* tentang */}
      <Card className="gap-0 rounded-3xl border-amber-100 py-0 dark:border-stone-800">
        <CardHeader className="px-5 pt-6 sm:px-6">
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="size-4 text-amber-600 dark:text-amber-400" aria-hidden />
            Tentang Rutina
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-5 pb-6 text-sm leading-relaxed text-stone-500 sm:px-6 dark:text-stone-400">
          <p className="flex items-center gap-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white">
              <Sprout className="size-4" aria-hidden />
            </span>
            <span>
              <span className="font-semibold text-stone-800 dark:text-stone-100">
                Rutina — Kebun Kebiasaan
              </span>{" "}
              · versi 2.0 mobile
            </span>
          </p>
          <p>
            Dibangun dengan shadcn/ui sebagai kerangka, Motion untuk animasi
            pegas, dan anime.js untuk koreografi tanaman yang tumbuh.
          </p>
          <p className="flex items-start gap-2">
            <Leaf className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
            Fitur jadwal fleksibel, skor kekuatan, pengingat, dan ekspor CSV
            diilhami riset aplikasi habit tracker open source terpopuler —
            Loop Habit Tracker (iSoron) dan sistem lencana ala Habitica.
          </p>
          <p className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
            Local-first &amp; privat: seluruh data hanya tersimpan di
            localStorage peramban ini, tanpa server.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
