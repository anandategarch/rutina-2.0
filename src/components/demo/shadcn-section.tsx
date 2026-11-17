"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { DemoCard, SectionShell } from "./shared";

import {
  Blocks,
  CheckCircle2,
  Copy,
  Heart,
  Info,
  Loader2,
  MoreHorizontal,
  Pencil,
  Save,
  Sparkles,
  Terminal,
  Trash2,
  TriangleAlert,
} from "lucide-react";

function ButtonsDemo() {
  const [loading, setLoading] = useState(false);

  const handleFakeSave = () => {
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      toast.success("Berhasil disimpan");
    }, 1400);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => toast.success("Berhasil disimpan")}>
          <Save aria-hidden /> Simpan
        </Button>
        <Button variant="secondary">Draft</Button>
        <Button variant="outline">Pratinjau</Button>
        <Button variant="ghost">Batal</Button>
        <Button variant="destructive">
          <Trash2 aria-hidden /> Hapus
        </Button>
        <Button variant="link">Pelajari</Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm">Kecil</Button>
        <Button size="default">Sedang</Button>
        <Button size="lg">Besar</Button>
        <Button
          onClick={handleFakeSave}
          disabled={loading}
          className="min-w-28"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" aria-hidden /> Menyimpan…
            </>
          ) : (
            <>
              <Save aria-hidden /> Simpan Data
            </>
          )}
        </Button>
        <Button variant="outline" disabled>
          Nonaktif
        </Button>
      </div>
    </div>
  );
}

function BadgesDemo() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>Baru</Badge>
        <Badge variant="secondary">Beta</Badge>
        <Badge variant="outline">v1.0</Badge>
        <Badge variant="destructive">Urgent</Badge>
        <Badge className="bg-emerald-600 hover:bg-emerald-600">
          Selesai
        </Badge>
        <Badge
          variant="outline"
          className="border-amber-300 text-amber-700"
        >
          Berjalan
        </Badge>
      </div>
      <Alert>
        <Terminal aria-hidden />
        <AlertTitle>Siap dipakai</AlertTitle>
        <AlertDescription>
          Semua komponen ini sudah terpasang di proyek — tinggal impor.
        </AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <TriangleAlert aria-hidden />
        <AlertTitle>Jaringan terputus</AlertTitle>
        <AlertDescription>
          Perubahan disimpan sementara di perangkat.
        </AlertDescription>
      </Alert>
    </div>
  );
}

function DialogDemo() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Sparkles aria-hidden /> Buka Dialog
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tanam kebiasaan baru</DialogTitle>
          <DialogDescription>
            Isi detailnya, lalu simpan untuk mulai menumbuhkan rutinitasmu.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="habit-name">Nama kebiasaan</Label>
            <Input id="habit-name" placeholder="cth. Menyiram tanaman" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="habit-notes">Catatan</Label>
            <Textarea
              id="habit-notes"
              placeholder="Opsional — pengingat kecil untuk dirimu"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Frekuensi</Label>
            <Select defaultValue="harian">
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih frekuensi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="harian">Harian</SelectItem>
                <SelectItem value="mingguan">Mingguan</SelectItem>
                <SelectItem value="bulanan">Bulanan</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Batal
          </Button>
          <Button
            onClick={() => {
              setOpen(false);
              toast.success("Berhasil disimpan");
            }}
          >
            <Save aria-hidden /> Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MenuDemo() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Menu aksi">
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          <DropdownMenuLabel>Aksi</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Pencil aria-hidden /> Ubah
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Copy aria-hidden /> Duplikat
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => toast("Item dipindah ke sampah")}
          >
            <Trash2 aria-hidden /> Hapus
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <HoverCard>
        <HoverCardTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 rounded-full pr-3 text-left transition hover:bg-stone-100"
            aria-label="Lihat profil"
          >
            <Avatar className="size-9 border border-stone-200">
              <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-semibold text-white">
                RT
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">
              <span className="block font-medium leading-tight">
                Rutina Team
              </span>
              <span className="block text-xs text-stone-400">
                @rutina · Penjaga Taman
              </span>
            </span>
          </button>
        </HoverCardTrigger>
        <HoverCardContent className="w-64">
          <div className="flex items-start gap-3">
            <Avatar className="size-10 border border-stone-200">
              <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-semibold text-white">
                RT
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <p className="text-sm font-semibold">Rutina Team</p>
              <p className="text-xs leading-relaxed text-stone-500">
                Merawat kebiasaan kecil setiap hari hingga tumbuh menjadi
                hutan rutinitas.
              </p>
              <div className="flex gap-1.5 pt-0.5">
                <Badge variant="secondary" className="text-[10px]">
                  131 efek
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  13 kategori
                </Badge>
              </div>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
    </div>
  );
}

function FormControlsDemo() {
  const [notif, setNotif] = useState(true);
  const [ringkas, setRingkas] = useState(false);
  const [volume, setVolume] = useState(65);
  const [tugas, setTugas] = useState<string[]>(["siram"]);

  const toggleTugas = (value: string, checked: boolean) =>
    setTugas((prev) =>
      checked ? [...prev, value] : prev.filter((v) => v !== value)
    );

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="habit-input">Nama kebiasaan</Label>
        <Input id="habit-input" placeholder="cth. Membaca 10 halaman" />
        <p className="text-xs text-stone-400">
          Teks bantu muncul di bawah input.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2.5">
        <div>
          <Label htmlFor="notif-switch" className="text-sm">
            Notifikasi
          </Label>
          <p className="text-xs text-stone-400">Pengingat jam 7 pagi</p>
        </div>
        <Switch
          id="notif-switch"
          checked={notif}
          onCheckedChange={setNotif}
          aria-label="Notifikasi"
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2.5">
        <div>
          <Label htmlFor="ringkas-switch" className="text-sm">
            Mode ringkas
          </Label>
          <p className="text-xs text-stone-400">Sembunyikan deskripsi</p>
        </div>
        <Switch
          id="ringkas-switch"
          checked={ringkas}
          onCheckedChange={setRingkas}
          aria-label="Mode ringkas"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="volume-slider">Intensitas</Label>
          <span className="text-xs font-medium text-emerald-700">
            {volume}%
          </span>
        </div>
        <Slider
          id="volume-slider"
          value={[volume]}
          onValueChange={(v) => setVolume(v[0] ?? 0)}
          max={100}
          step={5}
        />
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-xs text-stone-500">Tugas hari ini</Label>
          {[
            { id: "siram", label: "Siram tanaman" },
            { id: "lari", label: "Lari pagi" },
            { id: "baca", label: "Baca jurnal" },
          ].map((t) => (
            <label
              key={t.id}
              className="flex items-center gap-2 text-sm"
            >
              <Checkbox
                checked={tugas.includes(t.id)}
                onCheckedChange={(c) => toggleTugas(t.id, c === true)}
              />
              {t.label}
            </label>
          ))}
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-stone-500">Frekuensi</Label>
          <RadioGroup defaultValue="harian" className="gap-2.5">
            {["Harian", "Mingguan", "Bulanan"].map((f) => (
              <label key={f} className="flex items-center gap-2 text-sm">
                <RadioGroupItem value={f.toLowerCase()} />
                {f}
              </label>
            ))}
          </RadioGroup>
        </div>
      </div>
    </div>
  );
}

function TabsDemo() {
  return (
    <Tabs defaultValue="ringkasan">
      <TabsList className="w-full">
        <TabsTrigger value="ringkasan" className="flex-1">
          Ringkasan
        </TabsTrigger>
        <TabsTrigger value="aktivitas" className="flex-1">
          Aktivitas
        </TabsTrigger>
        <TabsTrigger value="muat" className="flex-1">
          Muat
        </TabsTrigger>
      </TabsList>
      <TabsContent value="ringkasan" className="mt-4 space-y-4">
        {[
          { label: "Konsistensi", value: 82 },
          { label: "Fokus", value: 64 },
          { label: "Tidur", value: 91 },
        ].map((s) => (
          <div key={s.label} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span>{s.label}</span>
              <span className="font-medium text-emerald-700">{s.value}%</span>
            </div>
            <Progress value={s.value} />
          </div>
        ))}
      </TabsContent>
      <TabsContent value="aktivitas" className="mt-4 space-y-3">
        {[
          { n: "Ananda", a: "A", t: "menyelesaikan 5 kebiasaan" },
          { n: "Bagas", a: "B", t: "menambah catatan baru" },
          { n: "Citra", a: "C", t: "mencapai runtun 30 hari" },
        ].map((u) => (
          <div key={u.n} className="flex items-center gap-3">
            <Avatar className="size-8 border border-stone-200">
              <AvatarFallback className="bg-stone-100 text-xs font-medium">
                {u.a}
              </AvatarFallback>
            </Avatar>
            <p className="text-sm">
              <span className="font-medium">{u.n}</span>{" "}
              <span className="text-stone-500">{u.t}</span>
            </p>
          </div>
        ))}
      </TabsContent>
      <TabsContent value="muat" className="mt-4 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-3/5" />
            <Skeleton className="h-3 w-2/5" />
          </div>
        </div>
        <Skeleton className="h-16 w-full rounded-xl" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-16 rounded-lg" />
        </div>
        <p className="text-xs text-stone-400">
          Rangka pemuat (skeleton) selama data dimuat.
        </p>
      </TabsContent>
    </Tabs>
  );
}

function AccordionDemo() {
  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="q1">
        <AccordionTrigger>Apa itu shadcn/ui?</AccordionTrigger>
        <AccordionContent className="text-sm leading-relaxed text-stone-500">
          Kumpulan komponen yang dapat disalin, dibangun di atas Radix UI
          dan Tailwind CSS. Kode menjadi milikmu sepenuhnya — tanpa
          dependensi paket yang mengikat.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="q2">
        <AccordionTrigger>Bisakah dipakai di HTML statis?</AccordionTrigger>
        <AccordionContent className="text-sm leading-relaxed text-stone-500">
          Tidak langsung — shadcn/ui adalah komponen React. Untuk HTML
          statis seperti Rutina, gaya visualnya bisa ditiru dengan CSS
          murni, sedangkan logikanya perlu ditulis ulang dalam JavaScript
          biasa.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="q3">
        <AccordionTrigger>Bagaimana dengan tema gelap?</AccordionTrigger>
        <AccordionContent className="text-sm leading-relaxed text-stone-500">
          Semua komponen memakai variabel warna CSS, jadi mode gelap
          cukup dengan mengganti nilai variabelnya lewat kelas{" "}
          <code className="rounded bg-stone-100 px-1 py-0.5 text-xs">
            .dark
          </code>
          .
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function FeedbackDemo() {
  const simulate = () => {
    toast.promise(
      new Promise<void>((resolve) =>
        window.setTimeout(() => resolve(), 1800)
      ),
      {
        loading: "Menyimpan kebiasaan…",
        success: "Berhasil disimpan",
        error: "Gagal menyimpan",
      }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => toast.success("Berhasil disimpan")}>
          <CheckCircle2 aria-hidden /> Sukses
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            toast("Pengingat dipasang", {
              description: "Kami akan mengingatkanmu pukul 07.00 besok.",
            })
          }
        >
          <Info aria-hidden /> Info
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-rose-600 hover:text-rose-700"
          onClick={() => toast.error("Koneksi gagal, coba lagi")}
        >
          <TriangleAlert aria-hidden /> Galat
        </Button>
        <Button size="sm" variant="secondary" onClick={simulate}>
          <Loader2 aria-hidden /> Proses
        </Button>
      </div>

      <TooltipProvider>
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm">
                <Heart aria-hidden /> Arahkan ke saya
              </Button>
            </TooltipTrigger>
            <TooltipContent>Tooltip dari shadcn/ui</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="link" size="sm">
                Tautan bertips
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              Muncul juga dari atas
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      <div>
        <div className="flex items-center gap-2 text-xs text-stone-400">
          <span>Beranda</span>
          <Separator orientation="vertical" className="h-3" />
          <span>Kebiasaan</span>
          <Separator orientation="vertical" className="h-3" />
          <span className="text-stone-600">Detail</span>
        </div>
      </div>
    </div>
  );
}

export function ShadcnSection() {
  return (
    <SectionShell
      id="shadcn"
      accent="emerald"
      icon={Blocks}
      eyebrow="Pustaka 1 dari 3"
      title="shadcn/ui — kerangka antarmuka"
      description="Fondasi visual halaman ini: kartu, tombol, dialog, menu, form, tab, dan notifikasi — semuanya komponen shadcn/ui yang sudah terpasang di proyek. Klik apa saja, semuanya hidup."
    >
      <div className="grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
        <DemoCard
          title="Tombol"
          hint="Semua varian, ukuran, dan status"
          className="md:col-span-2"
        >
          <ButtonsDemo />
        </DemoCard>
        <DemoCard title="Lencana & Peringatan" hint="Badge dan Alert">
          <BadgesDemo />
        </DemoCard>
        <DemoCard title="Dialog & Menu" hint="Modal, dropdown, hover card">
          <DialogDemo />
        </DemoCard>
        <DemoCard title="Menu Aksi" hint="Dropdown & kartu hover">
          <MenuDemo />
        </DemoCard>
        <DemoCard
          title="Kontrol Formulir"
          hint="Input, sakelar, penggeser, centang"
        >
          <FormControlsDemo />
        </DemoCard>
        <DemoCard title="Tab & Progres" hint="Konten bergilir dengan Tabs">
          <TabsDemo />
        </DemoCard>
        <DemoCard title="Umpan Balik" hint="Toast, tooltip, pemisah">
          <FeedbackDemo />
        </DemoCard>
        <DemoCard title="Accordion" hint="FAQ yang bisa dilipat">
          <AccordionDemo />
        </DemoCard>
      </div>
    </SectionShell>
  );
}
