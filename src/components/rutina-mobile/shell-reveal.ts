'use client'

/**
 * Sinyal "cangkang telah terungkap" — jembatan kecil antara RutinaApp
 * (pemilik siklus splash → aplikasi) dan komponen entrance yang perlu
 * menunda koreografinya sampai splash benar-benar memudar.
 *
 * Masalah (fondasi animasi v2.87): layar Beranda dipasang LEBIH DAHULU
 * di balik splash opak (pra-pasang v2.40, 1,8 dtk) — entrance judul
 * per-kata (GSAP) yang bermain pada momen itu tidak pernah terlihat.
 * WordReveal judul Beranda memakai `hold={!useShellRevealed()}`: kata
 * tetap tersembunyi sampai RutinaApp memanggil markShellRevealed()
 * saat splash selesai, sehingga reveal tampil PERSIS saat kanvas
 * pertama kali terlihat.
 *
 * Implementasi: satu boolean module-scope + useSyncExternalStore
 * (murni, tanpa re-render global — hanya komponen yang bertanya yang
 * berlangganan). Dipanggil sekali seumur sesi; setelah terungkap,
 * seluruh layar berikutnya tak perlu menunggu apa pun.
 */
import { useSyncExternalStore } from 'react'

let revealed = false
const listeners = new Set<() => void>()

/** Tandai cangkang terungkap (panggil sekali dari RutinaApp). */
export function markShellRevealed() {
  if (revealed) return
  revealed = true
  listeners.forEach((listener) => listener())
}

function subscribe(callback: () => void) {
  listeners.add(callback)
  return () => {
    listeners.delete(callback)
  }
}

/** True setelah splash selesai dan aplikasi terlihat pengguna. */
export function useShellRevealed(): boolean {
  /* getServerSnapshot: true — pengguna server/SSR tidak pernah
     menahan konten (kata terlihat instan, aman hidrasi). */
  return useSyncExternalStore(
    subscribe,
    () => revealed,
    () => true,
  )
}
