'use client'

import Image from 'next/image'
import * as m from 'motion/react-m'
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  Dumbbell,
  Lightbulb,
  Search,
  Sprout,
  Target,
  Wallet,
} from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { barFill } from '@/lib/motion/transitions'
import { useFirstVisit } from '@/lib/motion/first-visit'
import { motionTokens } from '@/lib/motion/tokens'

import { formatIDR, formatIDRShort } from './finance/utils'
import { playfair } from './serif'
import { useShellRevealed } from './shell-reveal'
import { useQuickHub } from './quick-action-hub'
import { WordReveal } from './word-reveal'

/* ============================================================
   BERANDA MOBILE — hero foto split + bento 2×2 + agenda + insight
   (redesign mockup "mobile-home", v2.93 → diperhalus v2.94).

   Prinsip:
   • Semua angka berasal dari derivasi nyata HomeScreen (props) —
     tidak ada mockup number yang dikerasukan.
   • Hanya tampil di bawah lg (ponsel/tablet); desktop Beranda
     mempertahankan komposisi lama (pembungkus lg:hidden /
     hidden lg:block ada di screens/home.tsx).
   • Token semantic dipakai untuk semua permukaan fungsional;
     primitive (parchment di atas kartu matcha solid) hanya untuk
     lapisan dekoratif di atas warna tetap — content-inverse tidak
     bisa dipakai di sana karena ikut terbalik di mode gelap.
   ============================================================ */

/* ---------- Hero — foto pegunungan + split greeting/Fokus ---------- */

/** Satu baris fokus hari ini (kebiasaan nyata + status selesai). */
export interface HeroFocusItem {
  id: string
  title: string
  done: boolean
}

export interface HomeMobileHeroProps {
  /** Sapaan jam lokal yang sudah personal ("Selamat pagi, Ananda! 👋"). */
  greeting: string
  /** Maks 3 prioritas hari ini — pending dulu (urutan attention),
   *  lalu yang sudah selesai mengisi sisa slot. */
  focusItems: HeroFocusItem[]
  /** Misi terjadwal & selesai HARI INI (dcToday — sadar jeda). */
  doneToday: number
  scheduledToday: number
  /** Gerbang entrance & tunggu-splash dari HomeScreen. */
  playEntrance: boolean
  onToggleFocus: (habitId: string) => void
  onOpenStats: () => void
  onOpenProfile: () => void
}

export function HomeMobileHero({
  greeting,
  focusItems,
  doneToday,
  scheduledToday,
  playEntrance,
  onToggleFocus,
  onOpenStats,
  onOpenProfile,
}: HomeMobileHeroProps) {
  const openHub = useQuickHub((s) => s.openHub)
  const shellRevealed = useShellRevealed()

  const missionRemaining = Math.max(scheduledToday - doneToday, 0)
  const pct =
    scheduledToday > 0
      ? Math.min(Math.round((doneToday / scheduledToday) * 100), 100)
      : 0

  /* Judul kartu fokus mengikuti keadaan nyata hari ini — senada dengan
     heroHeadline hero lama (tidak mengarang target). */
  const focusTitle =
    scheduledToday === 0
      ? 'Hari tanpa misi terjadwal'
      : missionRemaining === 0
        ? 'Prioritas hari ini tuntas'
        : `Selesaikan ${focusItems.filter((f) => !f.done).length} kebiasaan utama`

  return (
    <m.section
      initial={playEntrance ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={{ duration: motionTokens.duration.enter }}
      aria-label="Sapaan dan fokus hari ini"
      className="relative"
    >
      {/* Wadah hero — tinggi adaptif; ≤360px komposisi menumpuk agar
          teks kartu fokus tidak terpelintir (spesifikasi responsif).
          Tepi bawah bukan sudut membulat melainkan kurva cekung lembut
          (mockup: latar kanvas "menyapu" naik ke dalam foto). */}
      <div className="relative h-[476px] overflow-hidden max-[400px]:h-[456px] max-[360px]:h-[552px]">
        <Image
          src="/images/rutina-home/hero-mountain-mobile.webp"
          alt="Pagi di pegunungan berkabut — cahaya matahari pagi menyapa lembah"
          fill
          priority
          /* Lebar render nyata: penuh di ponsel, mengikuti kolom konten
             (CONTENT_W) di tablet — hero disembunyikan di desktop (lg+). */
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 620px, 760px"
          className="object-cover object-[62%_28%]"
        />
        {/* Lapisan gradasi keterbacaan — terkuat di atas (header) dan
            kiri-bawah (sapaan); hero-surface gelap di kedua tema.
            QA 390px: kabut lembah terang menuntut lapisan bawah & kiri
            lebih pekat agar teks putih tetap kontras (AA). */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-hero-surface/60 via-hero-surface/15 to-hero-surface/75"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-hero-surface/60 via-hero-surface/25 to-transparent"
        />
        {/* Kurva cekung penutup hero — kanvas (background) menyapu naik
            ke dalam foto; fill mengikuti token agar utuh di mode gelap. */}
        <svg
          aria-hidden="true"
          viewBox="0 0 390 48"
          preserveAspectRatio="none"
          className="absolute inset-x-0 bottom-0 h-12 w-full fill-background"
        >
          <path d="M0 48 C 98 4 292 4 390 48 Z" />
        </svg>

        <div className="relative flex h-full flex-col px-4 pb-7 pt-[max(0.75rem,env(safe-area-inset-top))]">
          {/* Baris identitas + aksi — pencarian membuka Quick Action Hub
              (aksi nyata), avatar membuka Profil; tanpa bel notifikasi
              karena tidak ada sistem notifikasi (jangan tombol hias). */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-hero-surface-raised/55 text-hero-content backdrop-blur-sm"
              >
                <Sprout className="h-5 w-5" strokeWidth={2.2} />
              </span>
              <p className="text-body font-bold tracking-tight text-hero-content">
                rutina
                <span className="text-pistachio">.</span>
                <span className="ml-1 align-super text-eyebrow font-semibold text-hero-content-muted">
                  2.0
                </span>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <m.button
                type="button"
                onClick={openHub}
                aria-label="Cari dan aksi cepat"
                whileTap={{ scale: 0.92 }}
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-hero-surface-raised/45 text-hero-content backdrop-blur-sm transition-colors hover:bg-hero-surface-raised/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-parchment"
              >
                <Search className="h-[18px] w-[18px]" strokeWidth={2.2} />
              </m.button>
              <m.button
                type="button"
                onClick={onOpenProfile}
                aria-label="Buka profil dan pengaturan"
                whileTap={{ scale: 0.92 }}
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-parchment"
              >
                <Avatar className="h-9 w-9 border-2 border-hero-surface-raised/60 shadow-sm">
                  <AvatarFallback className="bg-cocoa text-eyebrow font-semibold tracking-widest text-parchment">
                    PR
                  </AvatarFallback>
                </Avatar>
              </m.button>
            </div>
          </div>

          {/* Komposisi split — sapaan/CTA kiri, kartu Fokus kanan.
              items-end: kartu memakai tinggi alami (tanpa ruang mati
              saat daftar pendek); ≤360px menumpuk lebar penuh.
              Salinan mengikuti mockup: sapaan personal, janji nilai
              "Terus jalani…", CTA pill parchment. Sapaan 1,5rem agar
              muat dua baris di kolom ~52% (QA 390px). */}
          <div className="mt-auto flex items-end gap-3 max-[360px]:flex-col">
            <div className="flex min-w-0 flex-1 flex-col">
              <WordReveal
                as="h1"
                text={greeting}
                visitKey="home-greeting"
                hold={!shellRevealed}
                className={`${playfair.className} mt-1.5 text-balance text-[1.5rem] font-semibold leading-tight tracking-tight text-hero-content max-[360px]:text-[1.75rem]`}
              />
              <m.p
                initial={playEntrance ? { opacity: 0, y: 8 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: motionTokens.duration.enter,
                  delay: motionTokens.delay.tight,
                  ease: motionTokens.easing.standard,
                }}
                className="mt-1.5 max-w-[26ch] text-body font-medium leading-snug text-hero-content-muted"
              >
                Terus jalani rutinitas baik untuk versi terbaikmu.
              </m.p>
              <m.button
                type="button"
                onClick={onOpenStats}
                whileTap={{ scale: 0.96 }}
                initial={playEntrance ? { opacity: 0, y: 8 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: motionTokens.duration.enter,
                  delay: motionTokens.delay.normal,
                  ease: motionTokens.easing.standard,
                }}
                className="mt-4 inline-flex h-11 w-fit cursor-pointer items-center gap-2 self-start rounded-full bg-surface-primary px-5 text-note font-bold text-content-primary shadow-lift transition-colors hover:bg-surface-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-parchment"
              >
                Lihat Progress
                <ArrowRight aria-hidden="true" className="h-4 w-4" strokeWidth={2.4} />
              </m.button>
            </div>

            <TodayFocusCard
              focusTitle={focusTitle}
              focusItems={focusItems}
              doneToday={doneToday}
              scheduledToday={scheduledToday}
              pct={pct}
              playEntrance={playEntrance}
              onToggleFocus={onToggleFocus}
            />
          </div>
        </div>
      </div>
    </m.section>
  )
}

/* Kartu Fokus Hari Ini — permukaan parchment PEKAT (bukan kaca
   low-contrast), progres jujur dcToday, centang memanggil toggleHabit. */
function TodayFocusCard({
  focusTitle,
  focusItems,
  doneToday,
  scheduledToday,
  pct,
  playEntrance,
  onToggleFocus,
}: {
  focusTitle: string
  focusItems: HeroFocusItem[]
  doneToday: number
  scheduledToday: number
  pct: number
  playEntrance: boolean
  onToggleFocus: (habitId: string) => void
}) {
  return (
    <m.div
      initial={playEntrance ? { opacity: 0, y: 16 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: motionTokens.duration.enter,
        delay: motionTokens.delay.relaxed,
        ease: motionTokens.easing.standard,
      }}
      className="relative w-[48%] shrink-0 overflow-hidden rounded-[1.5rem] border border-border bg-surface-primary p-3.5 shadow-lift max-[360px]:w-full"
    >
      {/* Tanaman pot dekoratif — menempel di tepi kanan-bawah kartu,
          mayoritas DI LUAR kartu (di atas foto, efek mockup "leaves
          overlap the edge"); pointer-events-none dan daftar prioritas
          diberi ruang (pr-8) agar teks tak pernah tertutup. */}
      <Image
        src="/images/rutina-home/plant-decoration.svg"
        alt=""
        width={59}
        height={72}
        unoptimized
        aria-hidden="true"
        className="pointer-events-none absolute -right-7 -bottom-2 h-[72px] w-[59px] object-contain opacity-95 drop-shadow-sm"
      />
      <div className="relative">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary"
          >
            <Target className="h-4 w-4" strokeWidth={2.2} />
          </span>
          <p className="min-w-0 truncate text-meta font-bold tracking-tight text-content-primary">
            Fokus Hari Ini
          </p>
        </div>

        <h3 className="mt-2 text-balance text-note font-bold leading-snug tracking-tight text-content-primary">
          {focusTitle}
        </h3>

        {/* Progres misi hari ini — angka & bar dari dcToday (sadar jeda),
            bukan dari panjang daftar fokus. Hitungan "X / Y" di KIRI
            bar (bebas tabrakan dengan tanaman di tepi kanan). */}
        {scheduledToday > 0 ? (
          <div className="mt-2.5 flex items-center gap-2.5">
            <p className="shrink-0 text-chart-label font-semibold tabular-nums text-content-muted">
              {doneToday} / {scheduledToday}
            </p>
            <div
              role="progressbar"
              aria-label={`Progres misi hari ini ${pct} persen`}
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-sunken"
            >
              <m.div
                className="h-full w-full origin-left rounded-full bg-primary"
                initial={false}
                animate={{ scaleX: Math.max(pct, 0.02) / 100 }}
                transition={barFill}
              />
            </div>
          </div>
        ) : (
          <p className="mt-2.5 text-meta font-medium leading-snug text-content-muted">
            Nikmati jedamu — tambah kebiasaan kapan pun kamu siap.
          </p>
        )}

        {/* Daftar prioritas — centang = toggleHabit nyata untuk HARI INI.
            pr-8 memberi ruang aman dari tanaman di tepi kanan-bawah. */}
        {focusItems.length > 0 && (
          <div className="mt-2.5 space-y-0.5 pr-8">
            {focusItems.map((item) => (
              <button
                key={item.id}
                type="button"
                role="checkbox"
                aria-checked={item.done}
                aria-label={`${item.title} — ${item.done ? 'selesai, batalkan' : 'tandai selesai'}`}
                onClick={() => onToggleFocus(item.id)}
                className="flex min-h-11 w-full cursor-pointer items-start gap-2.5 rounded-lg px-1 py-1 text-left transition-colors hover:bg-surface-sunken/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span
                  aria-hidden="true"
                  className={
                    'mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border transition-colors ' +
                    (item.done
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border-strong bg-surface-primary')
                  }
                >
                  {item.done && <Check className="h-3 w-3" strokeWidth={3.2} />}
                </span>
                <span
                  className={
                    'min-w-0 text-pretty text-meta font-semibold leading-snug ' +
                    (item.done
                      ? 'text-content-muted line-through decoration-border-strong'
                      : 'text-content-primary')
                  }
                >
                  {item.title}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </m.div>
  )
}

/* ---------- Bento 2×2 — Streak · Keuangan · Bugar · Jurnal ---------- */

export interface HomeBentoSummaryProps {
  /** Streak terbaik aktif hari ini (bestStreak). */
  streak: number
  /** Naik streak vs kemarin — badge hanya bila > 0 (jujur). */
  streakDelta: number
  /** Arus kas bersih seluruh transaksi (non-transfer). */
  netSaldo: number
  /** Vonis arus kas 7 hari (net + jumlah transaksi). */
  netCash7: { net: number; count: number }
  /** Tren kumulatif arus kas 7 hari (7 titik) — null bila sepi. */
  cashSpark: number[] | null
  /** Sesi latihan pekan berjalan & target sesi per pekan. */
  fitSessions: number
  fitTarget: number
  /** Catatan jurnal bertanggal hari ini. */
  journalToday: number
  onOpenKebiasaan: () => void
  onOpenKeuangan: () => void
  onOpenBugar: () => void
  onOpenJurnal: () => void
}

export function HomeBentoSummary({
  streak,
  streakDelta,
  netSaldo,
  netCash7,
  cashSpark,
  fitSessions,
  fitTarget,
  journalToday,
  onOpenKebiasaan,
  onOpenKeuangan,
  onOpenBugar,
  onOpenJurnal,
}: HomeBentoSummaryProps) {
  const playEntrance = useFirstVisit('home-bento-summary')

  return (
    <m.div
      initial={playEntrance ? { opacity: 0, y: 14 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: motionTokens.duration.enter,
        delay: motionTokens.delay.relaxed,
        ease: motionTokens.easing.standard,
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        {/* 1 — Streak: permukaan matcha, pita foto pegunungan rendah
            kontras di dasar kartu (aset mountain-wide-alternate dari
            paket redesain); angka & badge TIDAK pernah tertindih. */}
        <m.button
          type="button"
          onClick={onOpenKebiasaan}
          aria-label={`Streak terbaik ${streak} hari berturut-turut — buka Kebiasaan`}
          whileTap={{ scale: 0.97 }}
          initial={playEntrance ? { opacity: 0, y: 14 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={staggerIn(0)}
          className="relative flex min-h-[164px] cursor-pointer flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-matcha to-matcha-action-deep p-4 pb-0 text-left shadow-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <div className="relative flex items-center gap-2">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-parchment/20 text-parchment"
            >
              <BarChart3 className="h-4 w-4" strokeWidth={2.2} />
            </span>
            <span className="text-eyebrow font-bold tracking-tight text-parchment/90">
              Streak
            </span>
          </div>
          <p className="relative mt-auto flex items-baseline gap-1.5 pb-1">
            <span className="text-kpi-lg font-bold leading-none tabular-nums text-parchment">
              {streak}
            </span>
            <span className="text-note font-semibold text-parchment/85">hari</span>
          </p>
          {streakDelta > 0 && (
            <span className="relative mb-3 self-start rounded-full bg-parchment/20 px-2 py-0.5 text-chart-label font-bold tabular-nums text-parchment">
              ↗ +{streakDelta}
            </span>
          )}
          {/* Pita foto pegunungan — hanya bidang dekoratif paling bawah
              (aset mountain-wide-alternate); mask memudar ke atas
              sehingga siluet menyatu ke permukaan matcha — tanpa detail
              di belakang angka utama (QA: tinggi dipangkas ke 44px). */}
          <span
            aria-hidden="true"
            className="relative -mx-4 mb-0 block h-11 w-[calc(100%+2rem)] overflow-hidden"
          >
            <Image
              src="/images/rutina-home/mountain-wide-alternate.webp"
              alt=""
              fill
              sizes="200px"
              className="object-cover object-bottom opacity-35 [mask-image:linear-gradient(to_top,black_30%,transparent)]"
            />
          </span>
        </m.button>

        {/* 2 — Keuangan: permukaan linen hangat (spesifikasi: warm
            sand/beige), pill vonis arus kas 7 hari + sparkline nyata */}
        <m.button
          type="button"
          onClick={onOpenKeuangan}
          aria-label={`Saldo bersih ${formatIDR(netSaldo)} — buka Keuangan`}
          whileTap={{ scale: 0.97 }}
          initial={playEntrance ? { opacity: 0, y: 14 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={staggerIn(1)}
          className="relative flex min-h-[164px] cursor-pointer flex-col overflow-hidden rounded-3xl border border-border bg-surface-secondary p-4 text-left shadow-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-module-finance/15 text-module-finance-strong"
            >
              <Wallet className="h-4 w-4" strokeWidth={2.2} />
            </span>
            <span className="text-eyebrow font-bold tracking-tight text-content-secondary">
              Keuangan
            </span>
            <span
              aria-hidden="true"
              className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-primary text-content-muted"
            >
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.4} />
            </span>
          </div>
          <div className="relative mt-auto">
            <p
              className={
                'font-bold leading-none tracking-tight tabular-nums text-content-primary ' +
                /* Nominal panjang (≥ 8 digit) mengecil satu tingkat agar
                   tetap muat di tile setengah-lebar tanpa terpotong. */
                (formatIDR(netSaldo).length > 11 ? 'text-[19px]' : 'text-kpi-sm')
              }
            >
              {formatIDR(netSaldo)}
            </p>
            {/* Vonis arus kas 7 hari sebagai pill status — jujur: hanya
                bila benar-benar ada transaksi di jendela tersebut. */}
            {netCash7.count > 0 ? (
              <span
                className={
                  'mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-chart-label font-bold tabular-nums ' +
                  (netCash7.net >= 0
                    ? 'bg-success/15 text-success'
                    : 'bg-content-danger/10 text-content-danger')
                }
              >
                ↗ {netCash7.net >= 0 ? '+' : '−'}
                {formatIDRShort(Math.abs(netCash7.net))} · 7 hari
              </span>
            ) : (
              <p className="mt-1.5 text-pretty text-chart-label font-semibold leading-snug text-content-muted">
                saldo bersih semua dompet
              </p>
            )}
          </div>
          {cashSpark && <CashSparkline data={cashSpark} />}
        </m.button>

        {/* 3 — Bugar: parchment + cincin progres sesi pekan (SVG hidup) */}
        <m.button
          type="button"
          onClick={onOpenBugar}
          aria-label={
            fitTarget > 0
              ? `Progres latihan pekan ini ${fitSessions} dari ${fitTarget} sesi — buka Bugar`
              : `${fitSessions} sesi latihan pekan ini — buka Bugar`
          }
          whileTap={{ scale: 0.97 }}
          initial={playEntrance ? { opacity: 0, y: 14 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={staggerIn(2)}
          className="relative flex min-h-[164px] cursor-pointer flex-col overflow-hidden rounded-3xl border border-border bg-surface-primary p-4 text-left shadow-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-module-bugar/15 text-module-bugar-strong"
            >
              <Dumbbell className="h-4 w-4" strokeWidth={2.2} />
            </span>
            <span className="text-eyebrow font-bold tracking-tight text-content-secondary">
              Bugar
            </span>
            <span
              aria-hidden="true"
              className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-content-muted"
            >
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.4} />
            </span>
          </div>
          <div className="mt-auto">
            {/* Baris angka + cincin; badge di bawahnya memakai lebar
                penuh kartu agar "Target Mingguan" tidak terpotong di
                tile sempit (umpan balik QA 390px). */}
            <div className="flex items-center justify-between gap-2">
              {fitTarget > 0 ? (
                <p className="text-kpi font-bold leading-none tabular-nums text-content-primary">
                  {Math.min(Math.round((fitSessions / fitTarget) * 100), 100)}
                  <span className="text-note font-bold text-content-muted">%</span>
                </p>
              ) : (
                <p className="text-kpi font-bold leading-none tabular-nums text-content-primary">
                  {fitSessions}
                  <span className="text-note font-bold text-content-muted"> sesi</span>
                </p>
              )}
              <FitProgressRing
                ratio={fitTarget > 0 ? fitSessions / fitTarget : 0}
                showRing={fitTarget > 0}
                label={`Progres sesi latihan pekan ini ${fitSessions} dari ${fitTarget} sesi`}
              />
            </div>
            <span className="mt-1.5 inline-block rounded-full bg-surface-secondary px-2 py-0.5 text-chart-label font-semibold text-content-muted">
              {fitTarget > 0 ? 'Target Mingguan' : 'pekan ini'}
            </span>
          </div>
        </m.button>

        {/* 4 — Jurnal: matcha pekat + ilustrasi buku catatan */}
        <m.button
          type="button"
          onClick={onOpenJurnal}
          aria-label={`${journalToday} entri jurnal hari ini — buka Jurnal`}
          whileTap={{ scale: 0.97 }}
          initial={playEntrance ? { opacity: 0, y: 14 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={staggerIn(3)}
          className="relative flex min-h-[164px] cursor-pointer flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-matcha-ink to-matcha-action-deep p-4 text-left shadow-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <div className="relative flex items-center gap-2">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-parchment/20 text-parchment"
            >
              <BookOpen className="h-4 w-4" strokeWidth={2.2} />
            </span>
            <span className="text-eyebrow font-bold tracking-tight text-parchment/90">
              Jurnal
            </span>
            <span
              aria-hidden="true"
              className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-parchment/20 text-parchment"
            >
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.4} />
            </span>
          </div>
          {/* Teks dan ilustrasi berbagi baris bawah (bukan tumpang
              tindih) — QA 390px: label tak lagi terpotong buku. */}
          <div className="relative mt-auto flex items-end justify-between gap-2">
            <div className="min-w-0">
              <p className="text-kpi font-bold leading-none tabular-nums text-parchment">
                {journalToday}{' '}
                <span className="text-note font-bold text-parchment/85">entri</span>
              </p>
              <p className="mt-1 text-pretty text-chart-label font-semibold leading-snug text-parchment/80">
                {journalToday > 0 ? 'Hari ini' : 'Belum ada hari ini'}
              </p>
            </div>
            <Image
              src="/images/rutina-home/journal-notebook.svg"
              alt=""
              width={84}
              height={56}
              unoptimized
              aria-hidden="true"
              className="pointer-events-none -mb-1.5 -mr-1 h-14 w-[84px] shrink-0 object-contain"
            />
          </div>
        </m.button>
      </div>
    </m.div>
  )
}

/* ---------- Agenda Hari Ini — kartu ringkas gaya mockup ---------- */

/** Satu baris agenda (kebiasaan nyata hari ini — tertunda). */
export interface AgendaTodayRow {
  id: string
  title: string
  /** Jam pengingat "HH:MM" atau null (fleksibel). */
  time: string | null
  /** Ikon domain — dipetakan dari data nyata kebiasaan. */
  icon: 'bugar' | 'terukur' | 'umum'
}

export interface HomeAgendaTodayProps {
  /** Angka & label bulan blok tanggal ("23" / "NOV"). */
  dateNum: string
  dateMonth: string
  /** Misi tertunda hari ini, terurut jam pengingat — dipangkas 3. */
  rows: AgendaTodayRow[]
  /** Sisa misi tertunda di luar baris yang ditampilkan. */
  moreCount: number
  /** Misi terjadwal & selesai HARI INI (keadaan kosong/tuntas). */
  scheduledToday: number
  doneToday: number
  onSeeAll: () => void
  onAddHabit: () => void
}

const AGENDA_ROW_ICON = {
  bugar: Dumbbell,
  terukur: Target,
  umum: Sprout,
} as const

/** "07:00" → "07.00" (gaya waktu mockup); null → "Fleksibel". */
function agendaTimeLabel(t: string | null): string {
  return t ? t.replace(':', '.') : 'Fleksibel'
}

export function HomeAgendaToday({
  dateNum,
  dateMonth,
  rows,
  moreCount,
  scheduledToday,
  doneToday,
  onSeeAll,
  onAddHabit,
}: HomeAgendaTodayProps) {
  const playEntrance = useFirstVisit('home-agenda-today')

  const allDone = scheduledToday > 0 && rows.length === 0
  const isEmpty = scheduledToday === 0 && rows.length === 0

  return (
    <m.section
      initial={playEntrance ? { opacity: 0, y: 14 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: motionTokens.duration.enter,
        delay: motionTokens.delay.relaxed,
        ease: motionTokens.easing.standard,
      }}
      aria-label="Agenda hari ini"
      className="overflow-hidden rounded-3xl border border-border bg-surface-primary p-4 shadow-soft"
    >
      {/* Kepala kartu — ikon kalender + judul + aksi "Lihat Semua"
          yang membawa pandangan ke planner penuh (DateStrip + rel
          waktu) di bawah — bukan tombol hias. */}
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary"
        >
          <CalendarDays className="h-[18px] w-[18px]" strokeWidth={2.2} />
        </span>
        <h2 className="text-note font-bold tracking-tight text-content-primary">
          Agenda Hari Ini
        </h2>
        <button
          type="button"
          onClick={onSeeAll}
          className="ml-auto inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-full px-2.5 text-meta font-bold text-content-secondary transition-colors hover:bg-surface-secondary hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Lihat Semua
          <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.4} />
        </button>
      </div>

      {isEmpty ? (
        /* Tidak ada misi terjadwal — pesan tenang + pintu tambah
           kebiasaan (aksi nyata yang sudah ada di planner). */
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-surface-secondary/60 p-3.5">
          <p className="min-w-0 flex-1 text-pretty text-meta font-medium leading-relaxed text-content-secondary">
            Tidak ada misi terjadwal hari ini. Nikmati jedamu — tambah
            kebiasaan kapan pun kamu siap.
          </p>
          <button
            type="button"
            onClick={onAddHabit}
            className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-primary px-4 text-meta font-bold text-primary-foreground transition-colors hover:bg-action-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Sprout aria-hidden="true" className="h-4 w-4" strokeWidth={2.2} />
            Tambah kebiasaan
          </button>
        </div>
      ) : (
        <div className="mt-3.5 flex items-stretch gap-3.5">
          {/* Blok tanggal — angka besar + label bulan (mockup). */}
          <div
            aria-hidden="true"
            className="flex w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-surface-secondary py-2.5"
          >
            <span className="text-kpi font-bold leading-none tabular-nums text-content-primary">
              {dateNum}
            </span>
            <span className="mt-1 text-chart-label font-bold uppercase tracking-[0.14em] text-content-muted">
              {dateMonth}
            </span>
          </div>

          {/* Rel waktu — misi tertunda hari ini, dot aksen + judul +
              jam + chip ikon domain (pemetaan jujur dari data). */}
          <div className="min-w-0 flex-1">
            {allDone ? (
              <p className="flex h-full items-center text-pretty text-meta font-medium leading-relaxed text-content-secondary">
                Semua {scheduledToday} misi terjadwal hari ini sudah tuntas.
                Kerja bagus!
              </p>
            ) : (
              <>
                <div role="list" className="space-y-1">
                  {rows.map((row) => {
                    const Icon = AGENDA_ROW_ICON[row.icon]
                    return (
                      <div
                        key={row.id}
                        role="listitem"
                        className="flex min-h-11 items-center gap-2.5 rounded-xl px-1 py-1"
                      >
                        <span
                          aria-hidden="true"
                          className="h-2 w-2 shrink-0 rounded-full bg-primary"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-meta font-bold leading-tight tracking-tight text-content-primary">
                            {row.title}
                          </p>
                          <p className="text-chart-label font-semibold tabular-nums text-content-muted">
                            {agendaTimeLabel(row.time)}
                          </p>
                        </div>
                        <span
                          aria-hidden="true"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-surface-secondary text-content-secondary"
                        >
                          <Icon className="h-4 w-4" strokeWidth={2.1} />
                        </span>
                      </div>
                    )
                  })}
                </div>
                {moreCount > 0 && (
                  <p className="mt-1.5 px-1 text-chart-label font-semibold text-content-muted">
                    +{moreCount} misi lagi menunggu
                  </p>
                )}
                {doneToday > 0 && (
                  <p className="mt-1 px-1 text-chart-label font-semibold text-success">
                    {doneToday} selesai hari ini
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </m.section>
  )
}

/* ---------- Quick Insight — kartu hangat penutup ---------- */

export interface HomeQuickInsightProps {
  streak: number
  weekDone: number
  weekSched: number
  missionRemaining: number
  journalToday: number
  /** Hitungan misi 7 hari terakhir (dayCounts) — panah bila ada aktivitas. */
  spark: number[]
}

export function HomeQuickInsight({
  streak,
  weekDone,
  weekSched,
  missionRemaining,
  journalToday,
  spark,
}: HomeQuickInsightProps) {
  const playEntrance = useFirstVisit('home-quick-insight')

  /* SATU observasi jujur atas data nyata — tanpa klaim sebab-akibat
     dan tanpa angka karangan. */
  const text =
    streak >= 3
      ? `Kamu sudah konsisten ${streak} hari berturut-turut. Luar biasa!`
      : weekSched > 0 && weekDone >= weekSched && weekDone > 0
        ? 'Semua misi pekan ini sudah tuntas. Saatnya berbangga!'
        : journalToday > 0
          ? `${journalToday} catatan jurnal hari ini — refleksi yang terjaga.`
          : weekDone > 0
            ? `${weekDone} misi selesai pekan ini. Satu lagi untuk menjaga momentum.`
            : missionRemaining > 0
              ? 'Satu misi kecil hari ini cukup untuk menjaga momentum.'
              : 'Belum ada misi terjadwal — mulai satu kebiasaan kecil hari ini.'

  const hasSpark = spark.some((v) => v > 0)

  return (
    <m.section
      initial={playEntrance ? { opacity: 0, y: 14 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={motionTokens.preset.data}
      aria-label="Insight singkat"
      className="relative overflow-hidden rounded-3xl border border-gold/40 bg-gold/20 p-4"
    >
      <div className="flex items-center gap-3.5">
        <span
          aria-hidden="true"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold/30 text-warning"
        >
          <Lightbulb className="h-5 w-5" strokeWidth={2.1} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-note font-bold tracking-tight text-content-primary">
            Quick Insight
          </p>
          <p className="mt-0.5 text-pretty text-meta font-medium leading-relaxed text-content-secondary">
            {text}
          </p>
        </div>
        {hasSpark && <MissionsSparkArrow data={spark} />}
      </div>
    </m.section>
  )
}

/* ---------- Potongan kecil ---------- */

function staggerIn(i: number) {
  return {
    duration: motionTokens.duration.enter,
    delay: motionTokens.delay.relaxed + i * motionTokens.stagger.normal,
    ease: motionTokens.easing.standard,
  }
}

/** Sparkline arus kas 7 hari (kumulatif) — hanya dirender bila ada
 *  transaksi di jendela tersebut; dekoratif dengan ringkasan sr-only. */
function CashSparkline({ data }: { data: number[] }) {
  const n = data.length
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = 6 + (i / (n - 1)) * 88
    const y = 28 - ((v - min) / range) * 22
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  return (
    <>
      <span className="sr-only">Garis tren arus kas 7 hari terakhir</span>
      <svg
        aria-hidden="true"
        viewBox="0 0 100 32"
        preserveAspectRatio="none"
        className="pointer-events-none absolute bottom-3.5 right-3 h-8 w-24 text-module-finance/60"
        fill="none"
      >
        <polyline
          points={pts.join(' ')}
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </>
  )
}

/** Cincin progres sesi latihan pekan berjalan — SVG hidup (bukan gambar). */
function FitProgressRing({
  ratio,
  showRing,
  label,
}: {
  ratio: number
  showRing: boolean
  label: string
}) {
  if (!showRing) return null
  const R = 27
  const C = 2 * Math.PI * R
  const clamped = Math.min(Math.max(ratio, 0), 1)
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox="0 0 64 64"
      className="h-16 w-16 shrink-0 -rotate-90"
    >
      <circle
        cx="32"
        cy="32"
        r={R}
        fill="none"
        strokeWidth="7"
        className="stroke-module-bugar/15"
      />
      <m.circle
        cx="32"
        cy="32"
        r={R}
        fill="none"
        strokeWidth="7"
        strokeLinecap="round"
        className="stroke-module-bugar"
        strokeDasharray={C}
        initial={{ strokeDashoffset: C }}
        animate={{ strokeDashoffset: C * (1 - clamped) }}
        transition={barFill}
      />
    </svg>
  )
}

/** Panah zig-zag 7 hari — garis aktivitas nyata + mata panah di ujung. */
function MissionsSparkArrow({ data }: { data: number[] }) {
  const n = data.length
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = 5 + (i / (n - 1)) * 62
    const y = 32 - ((v - min) / range) * 24
    return [x, y] as const
  })
  const [ax, ay] = pts[n - 1]!
  const [bx, by] = pts[n - 2]!
  const ang = (Math.atan2(ay - by, ax - bx) * 180) / Math.PI
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 78 38"
      className="h-10 w-20 shrink-0 text-primary"
      fill="none"
    >
      <polyline
        points={pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g transform={`translate(${ax.toFixed(1)} ${ay.toFixed(1)}) rotate(${ang.toFixed(1)})`}>
        <path
          d="M0 0 L-7 -4.2 M0 0 L-7 4.2"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </g>
    </svg>
  )
}
