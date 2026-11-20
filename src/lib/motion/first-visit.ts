/**
 * Pintu masuk pertama-per-sesi — gerbang anti-replay entrance.
 *
 * Masalah (audit motion v2.27): layar Rutina di-remount oleh
 * AnimatePresence pergantian tab, sehingga SEMUA entrance (fade+rise,
 * stagger, cincin, batang XP) diputar ulang pada setiap kunjungan —
 * melanggar direktif motion "jangan animasikan seluruh layout setiap
 * kali tab berubah".
 *
 * Solusi: Set module-scope. `firstVisit(key)` mengembalikan true hanya
 * pada panggilan PERTAMA untuk key tersebut seumur sesi tab; panggilan
 * berikutnya (remount) mengembalikan false. Komponen memakai hasil ini
 * untuk memilih `initial={first ? {...} : false}` — kunjungan pertama
 * tetap diantar animasi, kunjungan ulang tampil instan.
 *
 * Sengaja BUKAN hook: fungsi murni, aman dipanggil di render (client);
 * Set module-scope ikut umur halaman (SSR punya Set terpisah yang tak
 * pernah dibaca balik — snapshot server tidak memakai nilai animasi).
 *
 * Konvensi key: '<layar>-<blok>' — contoh 'home-daybook', 'home-ring'.
 */
const visited = new Set<string>()

/** True hanya pada pemanggilan pertama untuk key ini (seumur sesi). */
export function firstVisit(key: string): boolean {
  if (visited.has(key)) return false
  visited.add(key)
  return true
}
