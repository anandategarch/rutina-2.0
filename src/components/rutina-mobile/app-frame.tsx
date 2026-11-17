import { RutinaApp } from './rutina-app'

/**
 * Aplikasi tampil layar penuh (full-bleed) di semua ukuran layar:
 * latar & navigasi memenuhi viewport; konten berada dalam kolom
 * terpusat (max-w) agar tetap nyaman dibaca di layar lebar.
 */
export function AppFrame() {
  return (
    <div className="h-dvh w-full overflow-hidden">
      <RutinaApp />
    </div>
  )
}
