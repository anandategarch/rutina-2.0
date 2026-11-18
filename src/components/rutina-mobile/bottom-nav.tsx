'use client'

import * as m from 'motion/react-m'
import {
  BarChart3,
  Dumbbell,
  Home,
  Sprout,
  Wallet,
} from 'lucide-react'
import { useRutina, type Screen } from './store'
import { CONTENT_W } from './layout-widths'

/* Navigasi bawah 5 item — Profil dibuka dari avatar header Beranda,
   bukan tab (menghindari 6 tab yang terlalu padat di 390px). Saat layar
   Profil aktif, seluruh navigasi disembunyikan oleh shell (rutina-app);
   orientasi pengguna dijaga tombol "Kembali" di atas layar Profil.

   Hanya untuk ponsel/tablet (di bawah lg): pada desktop navigasi berpindah
   ke bilah sisi (desktop-sidebar.tsx), tab bawah disembunyikan total. */

/* ===== "Ruang Warna" — aksen identitas tiap tab =====
   Struktur navigasi tetap konsisten (cangkang, pil, hierarki), namun pil
   + ikon + label aktif mewarisi warna domain tab: pengguna selalu tahu
   sedang berada di ruangan mana. Nilai via CSS var agar mode gelap ikut
   otomatis (pistachio, eucalyptus terang, dst.).
     icon  → base domain (grafis, ≥3:1)
     label → strong domain (teks 11px, ≥4,5:1 vs soft)
     pill  → soft domain (latar lembut) */
interface NavAccent {
  /** Warna ikon aktif — var CSS base domain. */
  icon: string
  /** Warna label aktif — var CSS strong domain. */
  label: string
  /** Latar pil aktif — var CSS soft domain. */
  pill: string
}

/** Peta aksen layar — dipakai tab bawah & bilah sisi desktop (satu sumber). */
export const NAV_ACCENT: Record<Screen, NavAccent> = {
  beranda: {
    icon: 'var(--palette-matcha)',
    label: 'var(--success)',
    pill: 'var(--palette-mist)',
  },
  bugar: {
    icon: 'var(--module-bugar)',
    label: 'var(--module-bugar-strong)',
    pill: 'var(--module-bugar-soft)',
  },
  keuangan: {
    icon: 'var(--module-finance)',
    label: 'var(--module-finance-strong)',
    pill: 'var(--module-finance-soft)',
  },
  kebiasaan: {
    icon: 'var(--module-kebiasaan)',
    label: 'var(--module-kebiasaan-strong)',
    pill: 'var(--module-kebiasaan-soft)',
  },
  statistik: {
    icon: 'var(--module-stats)',
    label: 'var(--module-stats-strong)',
    pill: 'var(--module-stats-soft)',
  },
  /* Layar non-tab (jurnal/profil) — navigasi disembunyikan shell;
     entri di sini hanya agar Record<Screen,…> lengkap bagi TypeScript. */
  jurnal: {
    icon: 'var(--module-journal)',
    label: 'var(--module-journal-strong)',
    pill: 'var(--module-journal-soft)',
  },
  profil: {
    icon: 'var(--module-profil)',
    label: 'var(--module-profil-strong)',
    pill: 'var(--module-profil-soft)',
  },
}

const TABS: { id: Screen; label: string; icon: typeof Home }[] = [
  { id: 'beranda', label: 'Beranda', icon: Home },
  { id: 'bugar', label: 'Bugar', icon: Dumbbell },
  { id: 'keuangan', label: 'Keuangan', icon: Wallet },
  { id: 'kebiasaan', label: 'Kebiasaan', icon: Sprout },
  { id: 'statistik', label: 'Statistik', icon: BarChart3 },
]

export function BottomNav() {
  const screen = useRutina((s) => s.screen)
  const setScreen = useRutina((s) => s.setScreen)

  /* Saat berada di Profil (bukan tab), shell menyembunyikan navigasi —
     pil tidak pernah tampil tanpa tab aktif, orientasi tetap jujur. */
  const activeTab = TABS.some((t) => t.id === screen)
  /* Aksen warna tab AKTIF — pil & teks mengikuti ruangan tempat pengguna
     berada sekarang (bukan warna tombol yang dituju). */
  const accent = NAV_ACCENT[screen]

  return (
    <nav
      aria-label="Navigasi utama"
      className="z-20 shrink-0 border-t border-border bg-surface-primary/95 pb-[max(env(safe-area-inset-bottom),10px)] pt-1 shadow-soft backdrop-blur-md lg:hidden"
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
              className="relative flex h-[58px] cursor-pointer flex-col items-center justify-center gap-0.5 transition-transform duration-150 active:scale-[0.94] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {active && activeTab && (
                <m.span
                  layoutId="nav-pill"
                  aria-hidden="true"
                  className="absolute inset-x-3 inset-y-[6px] rounded-full"
                  style={{ backgroundColor: accent.pill }}
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
                  className="h-[19px] w-[19px] text-content-muted transition-colors duration-300"
                  style={{ color: active ? accent.icon : undefined }}
                  strokeWidth={active ? 2.4 : 2}
                />
              </m.span>
              <span
                className="relative z-10 text-[11px] font-bold text-content-muted transition-colors duration-300"
                style={{ color: active ? accent.label : undefined }}
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
