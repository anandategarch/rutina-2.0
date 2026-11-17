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

/** Tema navigasi mengikuti layar aktif — pil & ikon berubah warna
 *  secara halus (crossfade 500ms) saat berpindah tab. */
const NAV_THEME: Record<
  Screen,
  { shell: string; pill: string; active: string; inactive: string }
> = {
  beranda: {
    shell: 'border-[#4A3B321F] bg-[#FAF9F6]/95',
    pill: 'bg-[#E4EFE0]',
    active: 'text-[#749B58]',
    inactive: 'text-[#4A3B32]/55',
  },
  jurnal: {
    shell: 'border-[#FAF9F6]/20 bg-[#5E8347]/95',
    pill: 'bg-[#FAF9F6]/20',
    active: 'text-[#FAF9F6]',
    inactive: 'text-[#FAF9F6]/60',
  },
  statistik: {
    shell: 'border-[#F5F3EE]/10 bg-[#231F1E]/95',
    pill: 'bg-[#4A3B32]',
    active: 'text-[#A3C489]',
    inactive: 'text-[#F5F3EE]/50',
  },
  profil: {
    shell: 'border-[#4A3B3214] bg-[#F5F3EE]/95',
    pill: 'bg-[#FAF9F6]',
    active: 'text-[#749B58]',
    inactive: 'text-[#4A3B32]/55',
  },
}

export function BottomNav() {
  const screen = useRutina((s) => s.screen)
  const setScreen = useRutina((s) => s.setScreen)
  const theme = NAV_THEME[screen]

  return (
    <motion.nav
      aria-label="Navigasi utama"
      initial={false}
      animate={{ backgroundColor: 'rgba(0,0,0,0)' }}
      className={`z-20 shrink-0 border-t pb-[max(env(safe-area-inset-bottom),10px)] pt-1 backdrop-blur-md transition-colors duration-500 ${theme.shell}`}
    >
      <div className="grid grid-cols-4">
        {TABS.map((tab) => {
          const active = screen === tab.id
          const tabTheme = NAV_THEME[tab.id]
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setScreen(tab.id)}
              aria-current={active ? 'page' : undefined}
              className="relative flex h-[58px] cursor-pointer flex-col items-center justify-center gap-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58]"
            >
              {active && (
                <motion.span
                  layoutId="nav-pill"
                  aria-hidden="true"
                  className={`absolute inset-x-3 inset-y-[6px] rounded-full ${tabTheme.pill}`}
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <motion.span
                aria-hidden="true"
                className="relative z-10 flex"
                animate={{ y: active ? -1 : 0, scale: active ? 1.08 : 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 26 }}
              >
                <tab.icon
                  className={`h-[19px] w-[19px] transition-colors duration-500 ${
                    active ? theme.active : theme.inactive
                  }`}
                  strokeWidth={active ? 2.4 : 2}
                />
              </motion.span>
              <span
                className={`relative z-10 text-[10px] font-bold transition-colors duration-500 ${
                  active ? theme.active : theme.inactive
                }`}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </motion.nav>
  )
}
