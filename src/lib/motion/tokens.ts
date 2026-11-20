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
 *
 * LAPISAN PRESET LAYAR (v2.35, audit final polish): entrance blok layar
 * memakai preset semantik — pageEntrance (hero/blok besar), panelReveal
 * (panel sedang), cardReveal (kartu/baris), chipReveal (elemen kecil) —
 * dipadu skala `delay` absolut (tight→sweep) dan spring bernama
 * (progressArc, rowEnter, letter). Karakter tiap ruang tetap berbeda;
 * yang disamakan adalah SUMBER angkanya, bukan rasanya.
 *
 * LAPISAN CSS PRESS (di luar Motion, disengaja): umpan balik tekan murah
 * di komponen dasar memakai kelas CSS `active:scale-*` + `duration-150`
 * (rutina-button 0.97 · bottom-nav 0.94 · rutina-tabs 0.96), utility
 * `interactive` (scale 0.98 · 160ms — dipakai 90+ titik), dan
 * `active:scale-[0.98]/[0.95]` tersebar di kartu/baris. Ini BUKAN
 * pelanggaran governance — CSS lebih murah dari Motion untuk press state.
 * Konvensi skala tekan Motion: 0.96–0.97 elemen besar/kartu, 0.90–0.92
 * ikon/FAB kecil.
 *
 * KEBIJAKAN ANIMASI BERULANG (v2.37): hanya dua keluarga yang diizinkan —
 * (1) ambient identitas: ambientPulse (api streak) & gardenSway (pohon
 * kebun); (2) indikator FUNGSIONAL: activityPulse (autosave Jurnal) serta
 * CSS animate-pulse-soft / animate-breathe untuk titik-hidup sesi latihan
 * & cincin tujuan hampir tercapai (selalu dengan awalan motion-safe:).
 * Dekoratif lain (glow FAB, shine) dilarang.
 *
 * KOREOGRAFI SATU KALI (v2.37): timeline anime.js berdurasi tetap yang
 * bermain sekali per kejadian (splash, perayaan konfeti, pertumbuhan
 * tanaman, urutan baca) DIKECUALIKAN dari token ms — angkanya adalah
 * koreografi seni per-momen, bukan bahasa gerak lintas layar;
 * chartRevealMs/valuePopMs/gardenMilestone tetap token untuk pola yang
 * berulang lintas konteks.
 */

export const motionTokens = {
  duration: {
    /** Reaksi instan (hover, focus ring). */
    instant: 0.1,
    /** Crossfade cahaya ambien (blob kanvas) — sengaja paling lambat. */
    ambient: 0.8,
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
    /** Jatuh konfeti — akselerasi menuju lantai lalu memudar. */
    confettiFall: [0.4, 0.05, 0.8, 0.6] as const,
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
    /** Batang progres terisi — SATU karakter gerak untuk semua bar
     *  progres/skor lintas layar (konsolidasi audit v2.20: sebelumnya 4
     *  varian bebas {110,20} {110,21} {90,20} tersebar di 16 titik). */
    bar: {
      type: 'spring' as const,
      stiffness: 110,
      damping: 21,
    },
    /** Morph batang grafik — tinggi/lebar berubah saat ganti periode. */
    chart: {
      type: 'spring' as const,
      stiffness: 260,
      damping: 24,
    },
    /** Ikon nav membesar saat tab aktif — pantulan kecil khas nav. */
    navPop: {
      type: 'spring' as const,
      stiffness: 500,
      damping: 26,
    },
    /** Busur progres bernilai (cincin XP Observatory) — lambat dan
     *  meyakinkan, berbeda dari spring.smooth cincin Beranda yang ikut
     *  centang kebiasaan secara reaktif. */
    progressArc: {
      type: 'spring' as const,
      stiffness: 80,
      damping: 18,
    },
    /** Baris daftar masuk (ledger Vault, transaksi baru muncul) —
     *  mantap dan terkontrol, lebih kencang dari smooth. */
    rowEnter: {
      type: 'spring' as const,
      stiffness: 320,
      damping: 28,
    },
    /** Huruf teks terbelah (SplitText) — pantulan tipografi khas. */
    letter: {
      type: 'spring' as const,
      stiffness: 380,
      damping: 30,
    },
  },

  /** Jeda berantai antar anak (detik) untuk stagger — dipakai pada
   *  `staggerChildren`/`delayChildren` wadah, ATAU dikalikan index
   *  untuk delay berurutan daftar (lihat pola `index * stagger`). */
  stagger: {
    tight: 0.035,
    normal: 0.05,
    relaxed: 0.07,
  },

  /** Offset masuk ABSOLUT (detik) — jeda sebelum sebuah blok muncul,
   *  untuk mengurutkan beberapa blok dalam satu pandangan. Berbeda
   *  dari `stagger` (jeda ANTAR anak): nilai ini dipasang langsung
   *  di `delay` transisi. (Governance v2.35: sebelumnya 0.05–0.18
   *  ditulis bebas di 30+ titik.) */
  delay: {
    /** Offset terhalus — cascadeBlurFade berdekatan (v2.37: mematok
     *  literal 0.03/0.04 yang dahulu ditulis bebas di Keuangan). */
    micro: 0.03,
    /** Offset terkecil — blok tepat setelah blok sebelumnya. */
    tight: 0.05,
    /** Satu langkah kecil ke bawah (setengah beat). */
    step: 0.08,
    /** Offset baku — panel kedua dalam satu layar. */
    normal: 0.1,
    /** Offset lega — panel ketiga/keempat. */
    relaxed: 0.14,
    /** Rentetan penuh — blok penutup setelah beberapa blok masuk. */
    sweep: 0.18,
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
    /** Ayunan ambient pohon kebun (garden-tree) — animasi berulang
     *  kedua yang diizinkan; identitas Ruang Kebiasaan. Amplitudo
     *  ±1,2° dikontrol di komponen; MotionConfig reducedMotion="user"
     *  otomatis mematikan transform untuk pengguna reduce-motion.
     *  (v2.37: sebelumnya literal `duration: 7` bebas di komponen.) */
    gardenSway: { duration: 7, repeat: Infinity, ease: 'easeInOut' },
    /** Denyut AKTIVITAS (indikator autosave Jurnal) — satu-satunya
     *  animasi infinite kedua yang diizinkan; lebih cepat dari
     *  ambientPulse karena menandakan pekerjaan sedang berjalan. */
    activityPulse: { duration: 1.1, repeat: Infinity, ease: 'easeInOut' },
    /** Masuk blok BESAR layar (hero, panel utama, cincin sorotan) —
     *  tenang dan editorial. (v2.35: menggantikan literal 0.55 di
     *  hero Beranda, kebun, kartu keuangan Beranda, sidebar desktop.) */
    pageEntrance: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
    /** Panel sedang — kepala seksi, tombol utama, metadata Jurnal,
     *  detail Kebiasaan. (menggantikan literal 0.45.) */
    panelReveal: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
    /** Kartu & baris editorial — ritme baku antar bagian konten.
     *  (menggantikan literal 0.26–0.30.) */
    cardReveal: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
    /** Elemen kecil masuk — chip, stat mini, baris tombol Studio &
     *  panel Bugar. (menggantikan literal 0.24 yang paling tersebar.) */
    chipReveal: { duration: 0.24, ease: [0.22, 1, 0.36, 1] },
    /** Momen milestone kebun (pop XP, pengisian berjenjang) — durasi
     *  saja TANPA ease bawaan agar keyframe `times` milik pemanggil
     *  tetap linear seperti koreografi aslinya. */
    gardenMilestone: { duration: 0.9 },
    /** Transisi antar-RUANG (ganti layar utama) — ringan dan cepat,
     *  nilai hasil kalibrasi v2.34; entrance TIDAK ikut transisi ini
     *  (gerbang anti-replay firstVisit mengurusnya per layar). */
    screenSwap: { duration: 0.24, ease: [0.22, 1, 0.36, 1] },
    /** anime.js v4 (MILIDETIK) — stagger batang grafik terungkap. */
    chartRevealMs: { duration: 850 },
    /** anime.js v4 (MILIDETIK) — pop umpan balik nilai (saldo, angka). */
    valuePopMs: { duration: 520 },
  },
} as const

export type MotionToken = (typeof motionTokens)[keyof typeof motionTokens]
