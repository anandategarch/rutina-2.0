'use client'

import * as m from 'motion/react-m'
import {
  Dumbbell,
  Home,
  Plus,
  Sprout,
  Wallet,
} from 'lucide-react'
import { useRutina, type Screen } from './store'
import { useQuickHub } from './quick-action-hub'
import { motionTokens } from '@/lib/motion/tokens'
import { CONTENT_W } from './layout-widths'

/* Navigasi bawah v2.14 — "plus di tengah": EMPAT tab utama mengapit
   tombol plus besar di kolom tengah yang membuka Quick Action Hub
   (tambah kebiasaan, catatan, transaksi, latihan, asupan, check-in).
   Statistik turun dari deret tab — pintunya: kartu Rekap Pekan di
   Beranda + baris "Jelajahi" pada hub. Profil tetap dari avatar
   header Beranda (atau hub); Jurnal dari header Beranda / hub.
   Saat layar Profil aktif, seluruh navigasi disembunyikan oleh shell.

   Hanya untuk ponsel/tablet (di bawah lg): pada desktop navigasi
   berpindah ke bilah sisi (desktop-sidebar.tsx) — di sana keenam
   layar tetap tampil; tombol plus mengambang tetap di sudut kanan
   bawah (QuickActionFab, hanya lg+). */

/* ===== "Ruang Warna" — aksen identitas tiap tab =====
   Struktur navigasi tetap konsisten (cangkang, pil, hierarki), namun
   pil + ikon + label aktif mewarisi warna domain tab: pengguna selalu
   tahu sedang berada di ruangan mana. Nilai via CSS var agar mode
   gelap ikut otomatis (pistachio, eucalyptus terang, dst.).
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

/* Empat tab utama — dua di kiri plus, dua di kanannya. */
const TABS: { id: Screen; label: string; icon: typeof Home }[] = [
  { id: 'beranda', label: 'Beranda', icon: Home },
  { id: 'bugar', label: 'Bugar', icon: Dumbbell },
  { id: 'keuangan', label: 'Keuangan', icon: Wallet },
  { id: 'kebiasaan', label: 'Kebiasaan', icon: Sprout },
]

export function BottomNav({ revealed }: { revealed: boolean }) {
  const screen = useRutina((s) => s.screen)
  const setScreen = useRutina((s) => s.setScreen)
  const hubOpen = useQuickHub((s) => s.open)
  const toggleHub = useQuickHub((s) => s.toggleHub)

  /* Saat berada di Profil (bukan tab), shell menyembunyikan navigasi —
     pil tidak pernah tampil tanpa tab aktif, orientasi tetap jujur. */
  const activeTab = TABS.some((t) => t.id === screen)
  /* Aksen warna tab AKTIF — pil & teks mengikuti ruangan tempat pengguna
     berada sekarang (bukan warna tombol yang dituju). */
  const accent = NAV_ACCENT[screen]

  return (
    /* v2.40 koreografi reveal: sebelumnya nav (bersama seluruh ikonnya)
     muncul seketika begitu splash pergi. Kini cangkang bawah menunggu
     di balik splash dalam keadaan tersembunyi, lalu NAIK sebagai satu
     blok (spring.sheet — karakter gerak yang sama dengan bottom sheet:
     chrome bawah "menyapa" dari arah yang sama). `initial` selalu
     tersembunyi: remount pascalayar Profil ikut diantar naik — satu
     koreografi konsisten, bukan replay liar (gerbang anti-replay
     firstVisit tetap mengurus blok konten layar). */
    <m.nav
      aria-label="Navigasi utama"
      initial={{ y: 96, opacity: 0 }}
      animate={{ y: revealed ? 0 : 96, opacity: revealed ? 1 : 0 }}
      transition={motionTokens.spring.sheet}
      className="z-20 shrink-0 border-t border-border bg-surface-primary/95 pb-[max(env(safe-area-inset-bottom),10px)] pt-1 shadow-soft backdrop-blur-md lg:hidden"
    >
      <div className={`mx-auto grid w-full grid-cols-5 ${CONTENT_W}`}>
        {/* Tab 1 — Beranda */}
        <NavTab
          tab={TABS[0]!}
          active={screen === TABS[0]!.id}
          showPill={activeTab}
          accent={accent}
          onSelect={setScreen}
        />

        {/* Tab 2 — Bugar */}
        <NavTab
          tab={TABS[1]!}
          active={screen === TABS[1]!.id}
          showPill={activeTab}
          accent={accent}
          onSelect={setScreen}
        />

        {/* ===== Tombol plus besar di tengah — membuka Quick Action Hub =====
            Dock menonjol ke atas batas bar; "kerah" ring senada permukaan
            bar membuat lingkaran tampak keluar dari dalam navigasi. Halo
            STATIS menandai pintu aksi (animate-glow dihapus — direktif
            melarang animasi berulang dekoratif, pola yang sama dengan
            daily-highlight-card); plus berputar 45° menjadi silang saat
            hub terbuka. */}
        <div className="relative flex h-[58px] items-center justify-center">
          <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-[45%]">
            <span
              aria-hidden="true"
              className={`absolute -inset-2 rounded-full bg-primary/40 blur-md ${
                hubOpen ? 'opacity-0' : 'opacity-100'
              } transition-opacity duration-300`}
            />
            <m.button
              type="button"
              onClick={toggleHub}
              aria-label="Aksi cepat — tambah"
              aria-expanded={hubOpen}
              aria-haspopup="dialog"
              whileTap={{ scale: 0.92 }}
              transition={motionTokens.spring.snappy}
              className="relative flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lift ring-4 ring-surface-primary outline-none transition-colors duration-200 hover:bg-action-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <m.span
                aria-hidden="true"
                initial={false}
                animate={{ rotate: hubOpen ? 45 : 0 }}
                transition={motionTokens.spring.snappy}
                className="flex"
              >
                <Plus className="h-6 w-6" strokeWidth={2.4} />
              </m.span>
            </m.button>
          </div>
        </div>

        {/* Tab 3 — Keuangan */}
        <NavTab
          tab={TABS[2]!}
          active={screen === TABS[2]!.id}
          showPill={activeTab}
          accent={accent}
          onSelect={setScreen}
        />

        {/* Tab 4 — Kebiasaan */}
        <NavTab
          tab={TABS[3]!}
          active={screen === TABS[3]!.id}
          showPill={activeTab}
          accent={accent}
          onSelect={setScreen}
        />
      </div>
    </m.nav>
  )
}

/* Satu tab bawah — dipisah agar struktur 4-tab + plus mudah dibaca. */
function NavTab({
  tab,
  active,
  showPill,
  accent,
  onSelect,
}: {
  tab: { id: Screen; label: string; icon: typeof Home }
  active: boolean
  showPill: boolean
  accent: NavAccent
  onSelect: (s: Screen) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(tab.id)}
      aria-current={active ? 'page' : undefined}
      className="relative flex h-[58px] cursor-pointer flex-col items-center justify-center gap-0.5 transition-transform duration-150 active:scale-[0.94] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {active && showPill && (
        <m.span
          layoutId="nav-pill"
          aria-hidden="true"
          className="absolute inset-x-3 inset-y-[6px] rounded-full"
          style={{ backgroundColor: accent.pill }}
          transition={motionTokens.spring.snappy}
        />
      )}
      <m.span
        aria-hidden="true"
        className="relative z-10 flex"
        animate={{ y: active ? -1 : 0, scale: active ? 1.08 : 1 }}
        transition={motionTokens.spring.navPop}
      >
        <tab.icon
          className="h-[19px] w-[19px] text-content-muted transition-colors duration-300"
          style={{ color: active ? accent.icon : undefined }}
          strokeWidth={active ? 2.4 : 2}
        />
      </m.span>
      <span
        /* Layar sangat sempit (≤360px): label terpanjang
           "Kebiasaan" tepat selebar sel 64px — kecilkan satu
           tingkat agar tidak menyentuh tepi (matriks uji 320px). */
        className="relative z-10 text-eyebrow font-semibold text-content-muted transition-colors duration-300 max-[360px]:text-chart-label"
        style={{ color: active ? accent.label : undefined }}
      >
        {tab.label}
      </span>
    </button>
  )
}
