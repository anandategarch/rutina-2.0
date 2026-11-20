'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import {
  AnimatePresence,
  type Variants,
} from 'motion/react'
import * as m from 'motion/react-m'
import {
  computeLevel,
  computeXp,
  doneCountOn,
  SCREEN_THEME,
  todayISO,
  useRutina,
  type Screen,
} from './store'
import { toast } from 'sonner'

import { BottomNav } from './bottom-nav'
import { CheckInSheet } from './checkin-sheet'
import { QuickActionFab, QuickActionHub } from './quick-action-hub'
import { ComposeSheet } from './compose-sheet'
import { ReadingSheet } from './reading-sheet'
import { CelebrationOverlay } from './celebration'
import { Splash } from './splash'
import { AddTxSheet } from './finance/add-tx-sheet'
import { TransferSheet } from './finance/transfer-sheet'
import { ContributeGoalSheet, EditGoalDialog, NewGoalDialog } from './finance/goal-sheets'
import { HabitSheet } from './habit-sheet'
import { useSyncEngine } from './sync-engine'
import dynamic from 'next/dynamic'
import { WorkoutSheet } from './fitness/workout-sheet'
import { FoodSheet } from './fitness/food-sheet'
import { CONTENT_W } from './layout-widths'
import HomeScreen from './screens/home'
import { canvasFade } from '@/lib/motion/transitions'
import { motionTokens } from '@/lib/motion/tokens'

/* ===== Tahap 4 — code splitting (audit performa) =====
   Hanya Beranda yang statis (layar pertama); enam layar lain dimuat
   MALAS lewat dynamic() dengan skeleton tenang. Prefetch idle memuat
   semuanya di latar belakang ±1,5 dtk setelah app siap — navigasi tetap
   instan sementara bundel awal jauh lebih ringan (Keuangan ±3.1rb,
   Statistik ±2.1rb, Bugar ±1.8rb baris tidak lagi ikut chunk utama,
   begitu juga Recharts yang hanya dipakai dua layar itu). */
const loadBugar = () => import('./screens/bugar')
const loadJournal = () => import('./screens/journal')
const loadKebiasaan = () => import('./screens/kebiasaan')
const loadKeuangan = () => import('./screens/keuangan')
const loadStats = () => import('./screens/stats')
const loadProfile = () => import('./screens/profile')

const BugarScreen = dynamic(loadBugar, { ssr: false, loading: ScreenSkeleton })
const JournalScreen = dynamic(loadJournal, { ssr: false, loading: ScreenSkeleton })
const KebiasaanScreen = dynamic(loadKebiasaan, { ssr: false, loading: ScreenSkeleton })
const KeuanganScreen = dynamic(loadKeuangan, { ssr: false, loading: ScreenSkeleton })
const StatsScreen = dynamic(loadStats, { ssr: false, loading: ScreenSkeleton })
const ProfileScreen = dynamic(loadProfile, { ssr: false, loading: ScreenSkeleton })

/** Skeleton layar — blok kertas tenang bergaya Rutina (rutina-skeleton),
 *  bentuk mengikuti anatomi umum layar: kepala + hero + deretan bento. */
function ScreenSkeleton() {
  return (
    <div
      aria-hidden="true"
      aria-busy="true"
      className="flex h-full flex-col gap-4 px-4 pt-[max(1.25rem,env(safe-area-inset-top))]"
    >
      <div className="h-8 w-40 rounded-lg rutina-skeleton" />
      <div className="h-36 rounded-2xl rutina-skeleton" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-24 rounded-xl rutina-skeleton" />
        <div className="h-24 rounded-xl rutina-skeleton" />
      </div>
      <div className="h-64 rounded-2xl rutina-skeleton" />
    </div>
  )
}

/* Papan desain + lab CSS adalah alat internal (easter egg ketuk versi
   5×) — dimuat malas agar ±40KB kode dev tidak ikut bundel utama. */
const DesignBoard = dynamic(
  () => import('./design-board').then((mod) => mod.DesignBoard),
  { ssr: false },
)
/* Urutan tab — menentukan arah geser transisi (kiri ↔ kanan).
   Kebiasaan menggantikan Jurnal sebagai tab ke-4; layar Jurnal tetap
   ada (dibuka lewat Quick Action Hub) namun bukan tab. Profil berada
   terakhir untuk arah transisi, tetapi TIDAK ada di navigasi bawah —
   dibuka dari avatar header Beranda. */
const ORDER: Screen[] = [
  'beranda',
  'bugar',
  'keuangan',
  'kebiasaan',
  'statistik',
  'jurnal',
  'profil',
]

/* Variants transisi berarah — masuk dari sisi sesuai arah pindah tab.
   Audit Tahap 3: jarak & durasi DIPERKECIL (72px/0,32dtk → 24px/0,24dtk)
   karena perpindahan antarmodul adalah aktivitas SERING — transisi lebar
   membuat aplikasi terasa lambat; cukup isyarat arah, bukan perayaan. */
const slide: Variants = {
  enter: (dir: number) => ({
    x: dir * 24,
    opacity: 0,
    scale: 0.99,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (dir: number) => ({
    x: dir * -24,
    opacity: 0,
    scale: 0.99,
  }),
}

export function RutinaApp() {
  const screen = useRutina((s) => s.screen)
  const prevScreen = useRutina((s) => s.prevScreen)
  const celebrating = useRutina((s) => s.celebrating)
  const bonusClaimed = useRutina((s) => s.bonusClaimed)
  const completions = useRutina((s) => s.completions)
  const boardOpen = useRutina((s) => s.boardOpen)
  const closeBoard = useRutina((s) => s.closeBoard)
  const [phase, setPhase] = useState<'splash' | 'app'>('splash')

  /* Callback stabil untuk Splash — tanpa ini identitas arrow berubah tiap
     re-render (rehidrasi persist / update store terjadi tepat saat splash
     berjalan), memicu ulang effect di Splash: timeline anime.js kembali ke
     nol dan timer 2,6 dtk di-reset (splash terlihat "tersendat"). */
  const handleSplashDone = useCallback(() => setPhase('app'), [])

  /* Mesin sinkronisasi cloud (Turso): pulihkan state persist paska-mount
     (pola skipHydration — render pertama memakai seed, lalu histori lokal
     mengambil alih tanpa hydration mismatch), tarik/unggah snapshot
     server, lalu kirim setiap perubahan domain secara ter-debounce.
     materializeRecurring dijalankan engine setelah sinkronisasi awal. */
  useSyncEngine()

  /* PWA — daftarkan service worker offline shell HANYA di production.
     Di dev, strategi stale-while-revalidate SW untuk chunk /_next/static
     menyajikan chunk basi setelah suntingan (kode baru baru muncul pada
     reload kedua) — membingungkan iterasi. Kegagalan didiamkan: SW adalah
     pening pengalaman, bukan kebutuhan fungsional. */
  useEffect(() => {
    if (
      process.env.NODE_ENV === 'production' &&
      'serviceWorker' in navigator &&
      (location.protocol === 'https:' || location.hostname === 'localhost')
    ) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  /* Prefetch idle — enam layar malas dihangatkan di latar belakang
     begitu app tenang, sehingga navigasi pertama ke modul mana pun
     terasa instan tanpa membayar biaya ini di bundel awal. */
  useEffect(() => {
    const t = window.setTimeout(() => {
      void loadBugar()
      void loadJournal()
      void loadKebiasaan()
      void loadKeuangan()
      void loadStats()
      void loadProfile()
    }, 1500)
    return () => window.clearTimeout(t)
  }, [])

  /* Arah transisi (derivasi murni dari state): maju (1) bila pindah ke
     kanan, mundur (-1) bila ke kiri. */
  const dir =
    ORDER.indexOf(screen) >= ORDER.indexOf(prevScreen) ? 1 : -1

  /* "Ruang Warna" — kanvas & cahaya ambien tiap layar mengikuti identitas
     domainnya (SCREEN_THEME): Bugar eucalyptus, Keuangan bronze, Kebiasaan
     rose clay, Statistik slate, dst. Kanvas crossfade saat pindah tab;
     mode gelap memakai varian espresso bertint domain. */
  const { resolvedTheme } = useTheme()
  const dark = resolvedTheme === 'dark'
  const theme = SCREEN_THEME[screen]
  const canvas = dark ? theme.bgDark : theme.bg
  const glow = dark ? theme.glowDark : theme.glow

  /* Momen naik level — konfeti + toast, dipusatkan di shell agar berlaku
     untuk semua layar (misi bisa dicentang dari Beranda maupun Statistik).
     XP dihitung dari penyelesaian HARI INI yang nyata. */
  const leveledRef = useRef(false)
  const today = todayISO()
  const xp = computeXp(doneCountOn(completions, today), bonusClaimed)
  const level = computeLevel(xp)
  useEffect(() => {
    if (level >= 8 && !leveledRef.current) {
      leveledRef.current = true
      useRutina.getState().setCelebrating(true)
      toast.success('Naik ke Level 8 — petualang sejati!')
    }
  }, [level])

  return (
    /* MotionConfig reducedMotion="user" kini disediakan AppMotionProvider
       (LazyMotion domMax) di app-frame — tidak perlu duplikat di sini. */
    <div className="@container relative flex h-full w-full flex-col overflow-hidden text-content-primary">
        <AnimatePresence>
          {phase === 'splash' && (
            <Splash key="splash" onDone={handleSplashDone} />
          )}
        </AnimatePresence>

        {phase === 'app' && (
          <>
            {/* Kanvas utama — warnanya ber-crossfade mengikuti tab aktif */}
            <m.div
              aria-hidden="true"
              className="absolute inset-0"
              initial={false}
              animate={{ backgroundColor: canvas }}
              transition={canvasFade}
            />

            {/* Cahaya ambien — tiga blob lembut bernuansa warna domain layar */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
              <m.div
                className="absolute -left-24 -top-24 h-72 w-72 rounded-full blur-3xl"
                initial={false}
                animate={{ backgroundColor: glow[0] }}
                transition={{ duration: motionTokens.duration.ambient }}
              />
              <m.div
                className="absolute -bottom-28 -right-20 h-80 w-80 rounded-full blur-3xl"
                initial={false}
                animate={{ backgroundColor: glow[1] }}
                transition={{ duration: motionTokens.duration.ambient, delay: motionTokens.delay.tight }}
              />
              <m.div
                className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full blur-3xl"
                initial={false}
                animate={{ backgroundColor: glow[2] }}
                transition={{ duration: motionTokens.duration.ambient, delay: motionTokens.delay.normal }}
              />
            </div>

            {/* Area konten — kolom terpusat, layar penuh di perangkat kecil */}
            <div className="relative min-h-0 flex-1">
              <AnimatePresence mode="wait" initial={false} custom={dir}>
                <m.div
                  key={screen}
                  custom={dir}
                  variants={slide}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={motionTokens.preset.screenSwap}
                  className={`absolute inset-0 mx-auto w-full ${CONTENT_W}`}
                >
                  {screen === 'beranda' && <HomeScreen />}
                  {screen === 'bugar' && <BugarScreen />}
                  {screen === 'jurnal' && <JournalScreen />}
                  {screen === 'keuangan' && <KeuanganScreen />}
                  {screen === 'kebiasaan' && <KebiasaanScreen />}
                  {screen === 'statistik' && <StatsScreen />}
                  {screen === 'profil' && <ProfileScreen />}
                </m.div>
              </AnimatePresence>
            </div>

            {/* Navigasi bawah disembunyikan di layar Profil (bukan tab) —
                orientasi dijaga tombol "Kembali" pada layar Profil.
                Di desktop (lg+) tab bawah disembunyikan total oleh
                bottom-nav (lg:hidden); navigasi berpindah ke bilah sisi
                yang dirender app-frame di luar komponen ini. */}
            {screen !== 'profil' && <BottomNav />}
            {/* Pusat aksi cepat global — FAB mengambang (disembunyikan di
                Profil, konsisten dengan navigasi bawah) + hub + check-in. */}
            <QuickActionFab />
            <ComposeSheet />
            <ReadingSheet />
            <AddTxSheet />
            <TransferSheet />
            <ContributeGoalSheet />
            <NewGoalDialog />
            <EditGoalDialog />
            <HabitSheet />
            <WorkoutSheet />
            <FoodSheet />
            <CheckInSheet />
            <QuickActionHub />
            <DesignBoard open={boardOpen} onClose={closeBoard} />
            <CelebrationOverlay active={celebrating} />
          </>
        )}
      </div>
  )
}
