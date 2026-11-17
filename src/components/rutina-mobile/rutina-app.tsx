'use client'

import { useState } from 'react'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import { useRutina } from './store'
import { StatusBar } from './status-bar'
import { BottomNav } from './bottom-nav'
import { ComposeSheet } from './compose-sheet'
import { ReadingSheet } from './reading-sheet'
import { CelebrationOverlay } from './celebration'
import { Splash } from './splash'
import HomeScreen from './screens/home'
import JournalScreen from './screens/journal'
import StatsScreen from './screens/stats'
import ProfileScreen from './screens/profile'

export function RutinaApp({ skipSplash = false }: { skipSplash?: boolean }) {
  const screen = useRutina((s) => s.screen)
  const celebrating = useRutina((s) => s.celebrating)
  const [phase, setPhase] = useState<'splash' | 'app'>(
    skipSplash ? 'app' : 'splash',
  )

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#F5F3EE] text-[#231F1E]">
        <AnimatePresence>
          {phase === 'splash' && (
            <Splash key="splash" onDone={() => setPhase('app')} />
          )}
        </AnimatePresence>

        {phase === 'app' && (
          <>
            <StatusBar />

            <div className="relative min-h-0 flex-1">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={screen}
                  className="absolute inset-0"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
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

            {/* "Dynamic island" — hanya di mode bingkai (sm+) */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-2 z-30 hidden h-[22px] w-24 -translate-x-1/2 rounded-full bg-[#14100D] sm:block"
            />
          </>
        )}
      </div>
    </MotionConfig>
  )
}
