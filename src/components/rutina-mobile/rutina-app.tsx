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
import { ContributeGoalSheet, NewGoalDialog } from './finance/goal-sheets'
import { HabitSheet } from './habit-sheet'
import { DesignBoard } from './design-board'
import { useSyncEngine } from './sync-engine'
import { WorkoutSheet } from './fitness/workout-sheet'
import { FoodSheet } from './fitness/food-sheet'
import { CONTENT_W } from './layout-widths'
import HomeScreen from './screens/home'
import JournalScreen from './screens/journal'
import KebiasaanScreen from './screens/kebiasaan'
import KeuanganScreen from './screens/keuangan'
import StatsScreen from './screens/stats'
import ProfileScreen from './screens/profile'
import BugarScreen from './screens/bugar'

import { motionTokens } from '@/lib/motion/tokens'
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

/* Variants transisi berarah — masuk dari sisi sesuai arah pindah tab. */
const slide: Variants = {
  enter: (dir: number) => ({
    x: dir * 72,
    opacity: 0,
    scale: 0.985,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (dir: number) => ({
    x: dir * -72,
    opacity: 0,
    scale: 0.985,
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
              transition={{ duration: 0.55, ease: motionTokens.easing.standard }}
            />

            {/* Cahaya ambien — tiga blob lembut bernuansa warna domain layar */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
              <m.div
                className="absolute -left-24 -top-24 h-72 w-72 rounded-full blur-3xl"
                initial={false}
                animate={{ backgroundColor: glow[0] }}
                transition={{ duration: 0.8 }}
              />
              <m.div
                className="absolute -bottom-28 -right-20 h-80 w-80 rounded-full blur-3xl"
                initial={false}
                animate={{ backgroundColor: glow[1] }}
                transition={{ duration: 0.8, delay: 0.06 }}
              />
              <m.div
                className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full blur-3xl"
                initial={false}
                animate={{ backgroundColor: glow[2] }}
                transition={{ duration: 0.8, delay: 0.1 }}
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
                  transition={{ duration: 0.32, ease: motionTokens.easing.standard }}
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
