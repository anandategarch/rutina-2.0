/**
 * Motion tokens — bahasa gerak tunggal Rutina 2.0.
 *
 * Aturan governance: durasi, easing, dan spring TIDAK boleh ditulis
 * bebas di komponen. Setiap karakter interaksi punya token sendiri:
 *
 *   Umpan balik tombol  → spring.snappy
 *   Bottom sheet        → spring.smooth
 *   Perayaan lencana    → spring.playful
 *   Transisi halaman    → easing standard
 *   Progres             → spring.smooth / easing smooth
 */

export const motionTokens = {
  duration: {
    /** Reaksi instan (hover, focus ring). */
    instant: 0.1,
    /** Mikro-interaksi (chip, ikon). */
    micro: 0.16,
    /** Reaksi cepat (tutup chip, tekan tombol). */
    fast: 0.22,
    /** Interaksi standar (fade kartu, expand). */
    normal: 0.32,
    /** Masuk elemen besar (kartu, panel). */
    enter: 0.42,
    /** Momen dramatis (splash, perayaan). */
    dramatic: 0.65,
  },

  easing: {
    /** Standar Rutina — deselerasi lembut khas aplikasi tenang. */
    standard: [0.22, 1, 0.36, 1] as const,
    /** Kurva material — untuk perubahan state yang netral. */
    smooth: [0.4, 0, 0.2, 1] as const,
    /** Entrance tegas — elemen "mendarat" dengan pasti. */
    entrance: [0.16, 1, 0.3, 1] as const,
  },

  spring: {
    /** Umpan balik tombol — cepat, ringkas, tanpa lambungan. */
    snappy: {
      type: 'spring' as const,
      stiffness: 420,
      damping: 32,
    },
    /** Bottom sheet & panel — terasa berat dan terkontrol. */
    smooth: {
      type: 'spring' as const,
      stiffness: 150,
      damping: 24,
    },
    /** Sheet Rutina — sedikit lebih kencang dari smooth. */
    sheet: {
      type: 'spring' as const,
      stiffness: 340,
      damping: 34,
    },
    /** Perayaan — lentur, ceria, boleh memantul. */
    playful: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 18,
    },
    /** Angka/statistik naik — lambat dan meyakinkan. */
    ticker: {
      type: 'spring' as const,
      stiffness: 55,
      damping: 16,
    },
  },

  /** Jeda berantai antar anak (detik) untuk stagger. */
  stagger: {
    tight: 0.035,
    normal: 0.05,
    relaxed: 0.07,
  },

  /** Preset gerak berdasarkan FUNGSI — katalog tunggal lintas layar
   *  (governance audit v2.9). Komponen tidak lagi menulis durasi/easing
   *  bebas: pilih preset sesuai makna interaksinya. Durasi boleh berbeda
   *  antar preset — yang penting punya alasan dan satu sumber kebenaran.
   *
   *    interaction        umpan balik kontrol (tekan chip, sorot baris)
   *    interactionInstant reaksi sekecil mungkin (hover, active state)
   *    navigation         pergeseran panel (ganti tab, inspector, sheet)
   *    layout             perubahan komposisi (expand kartu, tile masuk)
   *    data / dataSlow    pengungkapan data (grafik, baris, angka)
   *    celebration        momen juara — meminjam spring.playful
   *    *Ms                preset anime.js v4 (MILIDETIK — jangan
   *                       tertukar dengan preset Motion di atas) */
  preset: {
    interaction: { duration: 0.22, ease: [0.4, 0, 0.2, 1] },
    interactionInstant: { duration: 0.12, ease: [0.4, 0, 0.2, 1] },
    navigation: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
    layout: { duration: 0.42, ease: [0.16, 1, 0.3, 1] },
    data: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    /** Pengungkapan data BESAR — cincin penuh / grafik besar yang perlu
     *  waktu bernapas sebelum terbaca utuh. */
    dataSlow: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
    celebration: { type: 'spring', stiffness: 300, damping: 18 },
    /** Denyut ambient — SALAH SATU dari sedikit animasi berulang yang
     *  diizinkan (api streak, amplitudo ≤8%). Direndam menjadi preset
     *  agar daftar animasi infinite bisa dihitung & diaudit. */
    ambientPulse: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' },
    /** anime.js v4 (MILIDETIK) — stagger batang grafik terungkap. */
    chartRevealMs: { duration: 850 },
    /** anime.js v4 (MILIDETIK) — pop umpan balik nilai (saldo, angka). */
    valuePopMs: { duration: 520 },
  },
} as const

export type MotionToken = (typeof motionTokens)[keyof typeof motionTokens]
