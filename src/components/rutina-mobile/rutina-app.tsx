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
  SCREEN_THEME,
  useRutina,
  type Screen,
} from './store'
import { toast } from 'sonner'

import { BottomNav } from './bottom-nav'
import { ComposeSheet } from './compose-sheet'
import { ReadingSheet } from './reading-sheet'
import { CelebrationOverlay } from './celebration'
import { Splash } from './splash'
import HomeScreen from './screens/home'
import JournalScreen from './screens/journal'
import StatsScreen from './screens/stats'
import ProfileScreen from './screens/profile'

/* Urutan tab — menentukan arah geser transisi (kiri ↔ kanan). */
const ORDER: Screen[] = ['beranda', 'jurnal', 'statistik', 'profil']

/** Cahaya ambien per layar: tiga blob radial dengan warna khas tiap tab. */
const AMBIENT: Record<Screen, [string, string, string]> = {
  beranda: ['rgba(228,239,224,0.9)', 'rgba(116,155,88,0.10)', 'rgba(234,229,217,0.7)'],
  jurnal: ['rgba(250,249,246,0.14)', 'rgba(35,31,30,0.16)', 'rgba(163,196,137,0.30)'],
  statistik: ['rgba(116,155,88,0.20)', 'rgba(74,59,50,0.65)', 'rgba(163,196,137,0.08)'],
  profil: ['rgba(250,249,246,0.16)', 'rgba(35,31,30,0.20)', 'rgba(217,142,107,0.35)'],
}

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
  const tasks = useRutina((s) => s.tasks)
  const bonusClaimed = useRutina((s) => s.bonusClaimed)
  const [phase, setPhase] = useState<'splash' | 'app'>('splash')

  /* Arah transisi (derivasi murni dari state): maju (1) bila pindah ke
     kanan, mundur (-1) bila ke kiri. */
  const dir =
    ORDER.indexOf(screen) >= ORDER.indexOf(prevScreen) ? 1 : -1

  const theme = SCREEN_THEME[screen]
  const ambient = AMBIENT[screen]

  /* Momen naik level — konfeti + toast, dipusatkan di shell agar berlaku
     untuk semua layar (tugas bisa dicentang dari Beranda maupun Statistik). */
  const leveledRef = useRef(false)
  const xp = computeXp(tasks.filter((t) => t.done).length, bonusClaimed)
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
                  className="absolute inset-0 mx-auto w-full max-w-[520px]"
                >
                  {screen === 'beranda' && <HomeScreen />}
                  {screen === 'jurnal' && <JournalScreen />}
                  {screen === 'statistik' && <StatsScreen />}
                  {screen === 'profil' && <ProfileScreen />}
                </motion.div>
              </AnimatePresence>
            </div>

            <BottomNav />
            <ComposeSheet />
            <ReadingSheet />
            <CelebrationOverlay active={celebrating} />
          </>
        )}
      </div>
    </MotionConfig>
  )
}
