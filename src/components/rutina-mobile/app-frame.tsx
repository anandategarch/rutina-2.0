import { AppMotionProvider } from '@/lib/motion/providers'

import { DesktopStage } from '@/components/rutina-mobile/desktop-stage'

/**
 * Aplikasi tampil layar penuh (full-bleed) di ponsel; pada layar lebar
 * (lg+) ia berdiri dalam bingkai ponsel di atas panggung split-screen
 * (panel brand + rail widget melayang) — lihat desktop-stage.tsx.
 *
 * AppMotionProvider (LazyMotion domMax + reducedMotion) membungkus
 * SELURUH pohon agar semua komponen m.* di bawahnya mendapat fitur
 * animasi dari satu sumber.
 */
export function AppFrame() {
  return (
    <AppMotionProvider>
      <DesktopStage />
    </AppMotionProvider>
  )
}
