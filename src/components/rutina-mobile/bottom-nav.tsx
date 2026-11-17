'use client'

import { motion } from 'motion/react'
import { BarChart3, BookOpen, Home, User } from 'lucide-react'
import { useRutina, type Screen } from './store'

const TABS: { id: Screen; label: string; icon: typeof Home }[] = [
  { id: 'beranda', label: 'Beranda', icon: Home },
  { id: 'jurnal', label: 'Jurnal', icon: BookOpen },
  { id: 'statistik', label: 'Statistik', icon: BarChart3 },
  { id: 'profil', label: 'Profil', icon: User },
]

export function BottomNav() {
  const screen = useRutina((s) => s.screen)
  const setScreen = useRutina((s) => s.setScreen)

  return (
    <nav
      aria-label="Navigasi utama"
      className="z-20 shrink-0 border-t border-[#4A3B321F] bg-[#FAF9F6]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <div className="grid grid-cols-4">
        {TABS.map((tab) => {
          const active = screen === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setScreen(tab.id)}
              aria-current={active ? 'page' : undefined}
              className="relative flex h-[62px] cursor-pointer flex-col items-center justify-center gap-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58]"
            >
              {active && (
                <motion.span
                  layoutId="nav-pill"
                  aria-hidden="true"
                  className="absolute inset-x-3 inset-y-[7px] rounded-full bg-[#E4EFE0]"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <tab.icon
                className={`relative z-10 h-[19px] w-[19px] transition-colors ${
                  active ? 'text-[#749B58]' : 'text-[#4A3B32]/55'
                }`}
                strokeWidth={active ? 2.4 : 2}
              />
              <span
                className={`relative z-10 text-[10px] font-bold transition-colors ${
                  active ? 'text-[#231F1E]' : 'text-[#4A3B32]/55'
                }`}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
