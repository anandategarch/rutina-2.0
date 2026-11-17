/**
 * Lebar kolom konten adaptif — 520px di ponsel (tidak berubah), lalu melebar
 * bertahap di panel preview / tablet / desktop agar sisi kiri-kanan tidak
 * tampak kosong ("terpotong"). Dipakai bersama oleh kanvas layar, navigasi
 * bawah, sheet, dan overlay perayaan agar semuanya sejajar.
 */
export const CONTENT_W =
  'max-w-[520px] sm:max-w-[620px] md:max-w-[760px] lg:max-w-[920px] xl:max-w-[1080px]'
