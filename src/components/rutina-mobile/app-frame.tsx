'use client'

import { useEffect } from 'react'

import { AppMotionProvider } from '@/lib/motion/providers'

import { ContextRail } from '@/components/rutina-mobile/context-rail'
import { DesktopSidebar } from '@/components/rutina-mobile/desktop-sidebar'
import { RutinaApp } from '@/components/rutina-mobile/rutina-app'
import { useRutina, type Screen } from '@/components/rutina-mobile/store'

/* Pintasan keyboard desktop: tombol 1-7 memindah layar sesuai urutan nav
   (review UI/UX v2.44 — Jurnal kini layar ke-6, sejajar bilah sisi). */
const SHORTCUT_SCREENS: readonly Screen[] = [
  'beranda',
  'bugar',
  'kebiasaan',
  'keuangan',
  'statistik',
  'jurnal',
  'profil',
] as const

/**
 * Pintasan layar 1-7 — hanya aktif di viewport desktop (lg+) dan saat tidak
 * ada bidang teks yang fokus, agar tidak mengganggu pengetikan.
 */
function useDesktopScreenShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (!window.matchMedia('(min-width: 1024px)').matches) return
      const match = /^([1-7])$/.exec(e.key)
      if (!match) return
      const target = e.target
      if (
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return
      }
      const next = SHORTCUT_SCREENS[Number(match[1]) - 1]
      if (next) useRutina.getState().setScreen(next)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}

/**
 * Cangkang responsif aplikasi:
 *
 *   Ponsel (< lg)   → RutinaApp full-bleed 100% — tanpa tepian, tanpa
 *                     bingkai (perbaikan bug "tidak full screen").
 *   Desktop (lg+)   → grid aplikasi NATIF: bilah sisi + area utama.
 *   Lebar (xl+)     → + rail konteks di kanan.
 *
 *   ┌──────────┬────────────────────────────┬──────────┐
 *   │ Sidebar  │  Area utama (RutinaApp)    │  Rail    │
 *   │ navigasi │  kanvas + cahaya ambien    │ konteks  │
 *   └──────────┴────────────────────────────┴──────────┘
 *
 * Tidak ada lagi panggung pemasaran / bingkai ponsel — satu instance
 * RutinaApp dipakai di semua ukuran layar (tata letak digerakkan CSS).
 *
 * AppMotionProvider (LazyMotion domMax + reducedMotion) membungkus
 * SELURUH pohon agar semua komponen m.* di bawahnya mendapat fitur
 * animasi dari satu sumber.
 */
export function AppFrame() {
  useDesktopScreenShortcuts()

  return (
    <AppMotionProvider>
      <div className="h-dvh w-full overflow-hidden bg-background">
        {/* Ponsel: wadah blok sederhana, RutinaApp mengisi penuh.
            Desktop: grid tiga kolom (rail konteks baru muncul di xl). */}
        <div className="mx-auto h-full max-w-[1600px] lg:grid lg:grid-cols-[auto_minmax(0,1fr)] lg:grid-rows-1 xl:grid-cols-[auto_minmax(0,1fr)_auto]">
          <DesktopSidebar />

          {/* Area utama — meja lembut dengan cahaya ambien (lg+).
              Di bawah lg TIDAK ada padding: aplikasi full-bleed. */}
          <main className="relative h-full min-w-0 overflow-hidden lg:p-6 xl:p-8">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 hidden lg:block"
            >
              <div className="absolute left-1/4 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-secondary/60 blur-3xl" />
              <div className="absolute bottom-0 right-0 h-[28rem] w-[28rem] translate-x-1/4 translate-y-1/4 rounded-full bg-surface-secondary blur-3xl" />
            </div>

            {/* Permukaan aplikasi — mengisi area utama apa adanya,
                tanpa bingkai/rounded: tampilan program desktop natif. */}
            <RutinaApp />
          </main>

          <ContextRail />
        </div>
      </div>
    </AppMotionProvider>
  )
}
