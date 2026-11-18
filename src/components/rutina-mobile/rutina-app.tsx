'use client'

import { useEffect, useRef, useState } from 'react'
import {
  AnimatePresence,
  motion,
  MotionConfig,
  type Variants,
} from 'motion/react'
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
import { ComposeSheet } from './compose-sheet'
import { ReadingSheet } from './reading-sheet'
import { CelebrationOverlay } from './celebration'
import { Splash } from './splash'
import { AddTxSheet } from './finance/add-tx-sheet'
import { ContributeGoalSheet, NewGoalDialog } from './finance/goal-sheets'
import { HabitSheet } from './habit-sheet'
import { CONTENT_W } from './layout-widths'
import HomeScreen from './screens/home'
import JournalScreen from './screens/journal'
import KeuanganScreen from './screens/keuangan'
import StatsScreen from './screens/stats'
import ProfileScreen from './screens/profile'

/* Urutan tab — menentukan arah geser transisi (kiri ↔ kanan). */
const ORDER: Screen[] = ['beranda', 'jurnal', 'keuangan', 'statistik', 'profil']

/** Cahaya ambien lembut — SATU set netral (sand + matcha tipis) untuk semua
   layar. Kanvas utama seragam Warm Sand; perpindahan tab tidak lagi
   terasa seperti berpindah aplikasi. */
const AMBIENT: [string, string, string] = [
  'rgba(228,239,224,0.55)',
  'rgba(116,155,88,0.08)',
  'rgba(234,229,217,0.45)',
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
  const [phase, setPhase] = useState<'splash' | 'app'>('splash')

  /* Arah transisi (derivasi murni dari state): maju (1) bila pindah ke
     kanan, mundur (-1) bila ke kiri. */
  const dir =
    ORDER.indexOf(screen) >= ORDER.indexOf(prevScreen) ? 1 : -1

  /* Kanvas utama seragam Warm Sand untuk semua tab (SCREEN_THEME). */
  const theme = SCREEN_THEME[screen]
  const ambient = AMBIENT

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
    <MotionConfig reducedMotion="user">
      <div className="relative flex h-full w-full flex-col overflow-hidden text-[#231F1E]">
        <AnimatePresence>
          {phase === 'splash' && (
            <Splash key="splash" onDone={() => setPhase('app')} />
          )}
        </AnimatePresence>

        {phase === 'app' && (
          <>
            {/* Kanvas utama — warnanya ber-crossfade mengikuti tab aktif */}
            <motion.div
              aria-hidden="true"
              className="absolute inset-0"
              initial={false}
              animate={{ backgroundColor: theme.bg }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            />

            {/* Cahaya ambien — tiga blob lembut yang berganti warna per tab */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
              <motion.div
                className="absolute -left-24 -top-24 h-72 w-72 rounded-full blur-3xl"
                initial={false}
                animate={{ backgroundColor: ambient[0] }}
                transition={{ duration: 0.8 }}
              />
              <motion.div
                className="absolute -bottom-28 -right-20 h-80 w-80 rounded-full blur-3xl"
                initial={false}
                animate={{ backgroundColor: ambient[1] }}
                transition={{ duration: 0.8, delay: 0.06 }}
              />
              <motion.div
                className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full blur-3xl"
                initial={false}
                animate={{ backgroundColor: ambient[2] }}
                transition={{ duration: 0.8, delay: 0.1 }}
              />
            </div>

            {/* Area konten — kolom terpusat, layar penuh di perangkat kecil */}
            <div className="relative min-h-0 flex-1">
              <AnimatePresence mode="wait" initial={false} custom={dir}>
                <motion.div
                  key={screen}
                  custom={dir}
                  variants={slide}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                  className={`absolute inset-0 mx-auto w-full ${CONTENT_W}`}
                >
                  {screen === 'beranda' && <HomeScreen />}
                  {screen === 'jurnal' && <JournalScreen />}
                  {screen === 'keuangan' && <KeuanganScreen />}
                  {screen === 'statistik' && <StatsScreen />}
                  {screen === 'profil' && <ProfileScreen />}
                </motion.div>
              </AnimatePresence>
            </div>

            <BottomNav />
            <ComposeSheet />
            <ReadingSheet />
            <AddTxSheet />
            <ContributeGoalSheet />
            <NewGoalDialog />
            <HabitSheet />
            <CelebrationOverlay active={celebrating} />
          </>
        )}
      </div>
    </MotionConfig>
  )
}
