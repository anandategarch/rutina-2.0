'use client'

import * as m from 'motion/react-m'
import {
  BarChart3,
  BookOpen,
  Dumbbell,
  Home,
  Wallet,
} from 'lucide-react'
import { useRutina, type Screen } from './store'
import { CONTENT_W } from './layout-widths'

/* Navigasi bawah 5 item — Profil dibuka dari avatar header Beranda,
   bukan tab (menghindari 6 tab yang terlalu padat di 390px). */
const TABS: { id: Screen; label: string; icon: typeof Home }[] = [
  { id: 'beranda', label: 'Beranda', icon: Home },
  { id: 'bugar', label: 'Bugar', icon: Dumbbell },
  { id: 'keuangan', label: 'Keuangan', icon: Wallet },
  { id: 'jurnal', label: 'Jurnal', icon: BookOpen },
  { id: 'statistik', label: 'Statistik', icon: BarChart3 },
]

/**
 * Navigasi bawah KONSISTEN — cangkang, pil, dan warna aktif tidak berubah
 * antar tab agar orientasi pengguna tetap stabil. Identitas warna tiap
 * tab hidup pada konten layarnya (ikon, badge, grafik), bukan di navigasi.
 */
export function BottomNav() {
  const screen = useRutina((s) => s.screen)
  const setScreen = useRutina((s) => s.setScreen)

  /* Saat berada di Profil (bukan tab), tidak ada tab aktif — pil
     navigasi disembunyikan agar orientasi tetap jujur. */
  const activeTab = TABS.some((t) => t.id === screen)

  return (
    <nav
      aria-label="Navigasi utama"
      className="z-20 shrink-0 border-t border-[#4A3B321F] bg-[#FAF9F6]/95 pb-[max(env(safe-area-inset-bottom),10px)] pt-1 shadow-[0_-6px_20px_rgba(74,59,50,0.06)] backdrop-blur-md"
    >
      <div className={`mx-auto grid w-full grid-cols-5 ${CONTENT_W}`}>
        {TABS.map((tab) => {
          const active = screen === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setScreen(tab.id)}
              aria-current={active ? 'page' : undefined}
              className="relative flex h-[58px] cursor-pointer flex-col items-center justify-center gap-0.5 transition-transform duration-150 active:scale-[0.94] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58]"
            >
              {active && activeTab && (
                <m.span
                  layoutId="nav-pill"
                  aria-hidden="true"
                  className="absolute inset-x-3 inset-y-[6px] rounded-full bg-[#E4EFE0]"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <m.span
                aria-hidden="true"
                className="relative z-10 flex"
                animate={{ y: active ? -1 : 0, scale: active ? 1.08 : 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 26 }}
              >
                <tab.icon
                  className={`h-[19px] w-[19px] transition-colors duration-300 ${
                    active ? 'text-[#749B58]' : 'text-[#4A3B32]/55'
                  }`}
                  strokeWidth={active ? 2.4 : 2}
                />
              </m.span>
              <span
                className={`relative z-10 text-[11px] font-bold transition-colors duration-300 ${
                  active ? 'text-[#658A4C]' : 'text-[#4A3B32]/60'
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
