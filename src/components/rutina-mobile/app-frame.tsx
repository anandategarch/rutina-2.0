import { DesktopStage } from '@/components/rutina-mobile/desktop-stage'

/**
 * Aplikasi tampil layar penuh (full-bleed) di ponsel; pada layar lebar
 * (lg+) ia berdiri dalam bingkai ponsel di atas panggung split-screen
 * (panel brand + rail widget melayang) — lihat desktop-stage.tsx.
 */
export function AppFrame() {
  return <DesktopStage />
}
