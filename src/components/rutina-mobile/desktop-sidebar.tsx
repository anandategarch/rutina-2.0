'use client'

import * as m from 'motion/react-m'
import {
  BarChart3,
  CloudCheck,
  Dumbbell,
  Home,
  Sprout,
  User,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

import { motionTokens } from '@/lib/motion/tokens'

import { useRutina, type Screen } from './store'

/* Navigasi desktop — keenam layar (termasuk Profil: di desktop tidak ada
   avatar header yang selalu terlihat, jadi Profil sah menjadi item nav).
   Kebiasaan menggantikan Jurnal sebagai item ke-4; layar Jurnal tetap
   dapat dibuka lewat Quick Action Hub. */
const NAV_ITEMS: { id: Screen; label: string; icon: LucideIcon }[] = [
  { id: 'beranda', label: 'Beranda', icon: Home },
  { id: 'bugar', label: 'Bugar', icon: Dumbbell },
  { id: 'keuangan', label: 'Keuangan', icon: Wallet },
  { id: 'kebiasaan', label: 'Kebiasaan', icon: Sprout },
  { id: 'statistik', label: 'Statistik', icon: BarChart3 },
  { id: 'profil', label: 'Profil', icon: User },
]

/**
 * Bilah sisi desktop (lg+) — pengganti panggung pemasaran lama. Aplikasi
 * tampil NATIF sebagai program desktop: navigasi tinggal di kiri, konten
 * di tengah, dan rail konteks di kanan (komponen terpisah). Di bawah lg
 * seluruh bilah disembunyikan; navigasi kembali ke tab bawah ponsel.
 */
export function DesktopSidebar() {
  const screen = useRutina((s) => s.screen)
  const setScreen = useRutina((s) => s.setScreen)

  return (
    <m.nav
      aria-label="Navigasi utama"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: motionTokens.easing.standard }}
      className="hidden h-full w-60 shrink-0 flex-col border-r border-border bg-surface-primary lg:flex"
    >
      {/* Wordmark + tagline */}
      <div className="px-5 pb-2 pt-6">
        <p className="text-[21px] font-bold tracking-tight text-content-primary">
          rutina<span className="text-primary">.</span>
        </p>
        <p className="mt-0.5 text-[11px] font-medium text-content-muted">
          Personal Life System
        </p>
      </div>

      {/* Daftar navigasi */}
      <ul className="mt-4 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 pb-4">
        {NAV_ITEMS.map((item) => {
          const active = screen === item.id
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setScreen(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left outline-offset-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                  active
                    ? 'text-content-primary'
                    : 'text-content-muted hover:bg-surface-secondary'
                }`}
              >
                {active && (
                  <m.span
                    layoutId="nav-pill-desktop"
                    aria-hidden="true"
                    className="absolute inset-0 rounded-xl bg-secondary"
                    transition={motionTokens.spring.snappy}
                  />
                )}
                <item.icon
                  aria-hidden="true"
                  className={`relative z-10 h-[18px] w-[18px] shrink-0 transition-colors ${
                    active ? 'text-primary' : 'text-content-muted'
                  }`}
                  strokeWidth={active ? 2.4 : 2}
                />
                <span
                  className={`relative z-10 text-[14px] transition-colors ${
                    active
                      ? 'font-bold text-content-primary'
                      : 'font-medium text-content-muted'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {/* Kartu status sinkronisasi + versi */}
      <div className="px-3 pb-5">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-secondary/60 p-3.5">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-success"
          >
            <CloudCheck className="h-[18px] w-[18px]" strokeWidth={2} />
          </span>
          <span className="min-w-0">
            <span className="block text-[12.5px] font-bold leading-tight text-content-primary">
              Tersinkron cloud
            </span>
            <span className="mt-0.5 block text-[11px] font-medium leading-snug text-content-muted">
              Data tersimpan otomatis
            </span>
          </span>
        </div>
        <p className="mt-3 px-1 text-[11px] font-medium text-content-muted">
          Rutina 2.0
        </p>
      </div>
    </m.nav>
  )
}
