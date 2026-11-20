'use client'

/**
 * Gerbang anti-replay entrance — versi hook (v2.35).
 *
 * Masalah (audit motion v2.27): layar Rutina di-remount oleh
 * AnimatePresence pergantian tab, sehingga SEMUA entrance (fade+rise,
 * stagger, cincin, batang XP) diputar ulang pada setiap kunjungan —
 * melanggar direktif motion "jangan animasikan seluruh layout setiap
 * kali tab berubah".
 *
 * v2.35 (audit final polish): implementasi lama adalah fungsi biasa
 * yang MEMUTASI Set module-scope saat render — bukan murni dan berisiko
 * janggal di StrictMode/concurrent UI. Kini penandaan kunjungan hanya
 * terjadi SETELAH commit lewat useEffect; pembacaan terjadi sekali di
 * initializer useState (render tetap murni).
 *
 * `useFirstVisit(key)` mengembalikan true hanya pada render pertama
 * untuk key tersebut seumur sesi tab; render/remount berikutnya
 * mengembalikan false. Komponen memakai hasil ini untuk memilih
 * `initial={first ? {...} : false}` — kunjungan pertama tetap diantar
 * animasi, kunjungan ulang tampil instan.
 *
 * Catatan lifecycle:
 * - Dua komponen dengan key SAMA yang mount bersamaan sama-sama melihat
 *   true — konvensi key per-blok membuat ini tidak terjadi (key unik).
 * - StrictMode double-effect aman: Set.add idempoten.
 * - Layar Rutina hanya render pascamount (dibelakang Splash), sehingga
 *   initializer tidak pernah berjalan di SSR; snapshot server selalu
 *   konsisten dengan hidrasi klien.
 *
 * Konvensi key: '<layar>-<blok>' — contoh 'home-daybook', 'home-ring'.
 */
import { useEffect, useState } from 'react'

const visited = new Set<string>()

/** True hanya pada render pertama untuk key ini (seumur sesi tab).
 *  Penandaan terjadi setelah commit — render tetap bebas efek samping. */
export function useFirstVisit(key: string): boolean {
  const [first] = useState(() => !visited.has(key))

  useEffect(() => {
    visited.add(key)
  }, [key])

  return first
}
