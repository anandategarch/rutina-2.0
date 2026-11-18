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
} as const

export type MotionToken = (typeof motionTokens)[keyof typeof motionTokens]
