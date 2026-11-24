'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import {
  AnimatePresence,
  type Variants,
} from 'motion/react'
import * as m from 'motion/react-m'
import {
  computeLevel,
  computeXp,
  doneCountOn,
  SCREEN_THEME,
  todayISO,
  useRutina,
  type Screen,
} from './store'
import { toast } from 'sonner'

import { BottomNav } from './bottom-nav'
import { CheckInSheet } from './checkin-sheet'
import { QuickActionFab, QuickActionHub } from './quick-action-hub'
import { ComposeSheet } from './compose-sheet'
import { ReadingSheet } from './reading-sheet'
import { CelebrationOverlay } from './celebration'
import { Splash } from './splash'
import { AddTxSheet } from './finance/add-tx-sheet'
import { TransferSheet } from './finance/transfer-sheet'
import { ContributeGoalSheet, EditGoalDialog, NewGoalDialog } from './finance/goal-sheets'
import { HabitSheet } from './habit-sheet'
import { useJournalUi } from './journal-ui'
import { useSessionStore } from './fitness/session-store'
import { useSyncEngine } from './sync-engine'
import { useScreenBackHistory } from './overlay-escape'
import { SyncStatusStrip } from './sync-status-card'
import { markShellRevealed } from './shell-reveal'
import dynamic from 'next/dynamic'
import { WorkoutSheet } from './fitness/workout-sheet'
import { FoodSheet } from './fitness/food-sheet'
import { CONTENT_W } from './layout-widths'
import HomeScreen from './screens/home'
import { canvasFade } from '@/lib/motion/transitions'
import { motionTokens } from '@/lib/motion/tokens'

/* ===== Tahap 4 — code splitting (audit performa) =====
   Hanya Beranda yang statis (layar pertama); enam layar lain dimuat
   MALAS lewat dynamic() dengan skeleton tenang. Prefetch idle memuat
   semuanya di latar belakang ±1,5 dtk setelah app siap — navigasi tetap
   instan sementara bundel awal jauh lebih ringan (Keuangan ±3.1rb,
   Statistik ±2.1rb, Bugar ±1.8rb baris tidak lagi ikut chunk utama,
   begitu juga Recharts yang hanya dipakai dua layar itu). */
const loadBugar = () => import('./screens/bugar')
const loadJournal = () => import('./screens/journal')
const loadKebiasaan = () => import('./screens/kebiasaan')
const loadKeuangan = () => import('./screens/keuangan')
const loadStats = () => import('./screens/stats')
const loadProfile = () => import('./screens/profile')

const BugarScreen = dynamic(loadBugar, { ssr: false, loading: ScreenSkeleton })
const JournalScreen = dynamic(loadJournal, { ssr: false, loading: ScreenSkeleton })
const KebiasaanScreen = dynamic(loadKebiasaan, { ssr: false, loading: ScreenSkeleton })
const KeuanganScreen = dynamic(loadKeuangan, { ssr: false, loading: ScreenSkeleton })
const StatsScreen = dynamic(loadStats, { ssr: false, loading: ScreenSkeleton })
const ProfileScreen = dynamic(loadProfile, { ssr: false, loading: ScreenSkeleton })

/** Skeleton layar — blok kertas tenang bergaya Rutina (rutina-skeleton),
 *  bentuk mengikuti anatomi umum layar: kepala + hero + deretan bento.
 *  v2.67 (audit UX §3): visual tetap aria-hidden, PENGUMUMAN terpisah
 *  lewat role=status — aria-busy di dalam aria-hidden diabaikan pembaca
 *  layar, sehingga pemuatan layar sebelumnya senyap total. */
function ScreenSkeleton() {
  return (
    <>
      <p role="status" aria-live="polite" className="sr-only">
        Memuat layar…
      </p>
      <div
        aria-hidden="true"
        className="flex h-full flex-col gap-4 px-4 pt-[max(1.25rem,env(safe-area-inset-top))]"
      >
        <div className="h-8 w-40 rounded-lg rutina-skeleton" />
        <div className="h-36 rounded-2xl rutina-skeleton" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-24 rounded-xl rutina-skeleton" />
          <div className="h-24 rounded-xl rutina-skeleton" />
        </div>
        <div className="h-64 rounded-2xl rutina-skeleton" />
      </div>
    </>
  )
}

/* Papan desain + lab CSS adalah alat internal (easter egg ketuk versi
   5×) — dimuat malas agar ±40KB kode dev tidak ikut bundel utama. */
const DesignBoard = dynamic(
  () => import('./design-board').then((mod) => mod.DesignBoard),
  { ssr: false },
)
/* Urutan tab — menentukan arah geser transisi (kiri ↔ kanan).
   v3.1: mengikuti urutan nav mock Make (Beranda, Kebiasaan, Bugar,
   Keuangan, Jurnal, Statistik, Profil). Profil berada terakhir untuk
   arah transisi; di desktop pintunya avatar topbar, di ponsel tetap
   dari kepala Beranda / hub. */
const ORDER: Screen[] = [
  'beranda',
  'kebiasaan',
  'bugar',
  'keuangan',
  'jurnal',
  'statistik',
  'profil',
]

/* Variants transisi berarah — masuk dari sisi sesuai arah pindah tab.
   Audit Tahap 3: jarak & durasi DIPERKECIL (72px/0,32dtk → 24px/0,24dtk)
   karena perpindahan antarmodul adalah aktivitas SERING — transisi lebar
   membuat aplikasi terasa lambat; cukup isyarat arah, bukan perayaan. */
const slide: Variants = {
  enter: (dir: number) => ({
    x: dir * 24,
    opacity: 0,
    scale: 0.99,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (dir: number) => ({
    x: dir * -24,
    opacity: 0,
    scale: 0.99,
  }),
}

export function RutinaApp() {
  const screen = useRutina((s) => s.screen)
  const prevScreen = useRutina((s) => s.prevScreen)
  const celebrating = useRutina((s) => s.celebrating)
  /* v2.45: klaim bonus kini ber-tanggal — reset alami tiap ganti hari. */
  const bonusClaimedOn = useRutina((s) => s.bonusClaimedOn)
  const bonusClaimed = bonusClaimedOn === todayISO()
  const completions = useRutina((s) => s.completions)
  const boardOpen = useRutina((s) => s.boardOpen)
  const closeBoard = useRutina((s) => s.closeBoard)
  const [phase, setPhase] = useState<'splash' | 'app'>('splash')
  /* Pra-pasang (v2.40): dulu SELURUH cangkang aplikasi (Beranda + nav +
     FAB + belasan sheet) terpasang dalam SATU commit React tepat saat
     splash mulai memudar — main thread tersita ratusan ms pada frame
     paling terlihat, transisi ikon tersendat. Kini cangkang dipasang
     LEBIH DAHULU di balik splash yang opak (z-70): pada 1,8 dtk semua
     aksi splash (goresan 1,09 dtk · judul 1,47 dtk · tagline 1,7 dtk)
     telah selesai, masih tersisa 0,8 dtk sebelum exit 2,6 dtk — pohon
     dirender, layout dihitung, entrance Beranda bermain tersembunyi.
     Saat splash memudar, aplikasi SUDAH duduk tenang: tanpa lonjakan
     thread, tanpa pop mendadak. Reduced-motion: splash hanya 0,5 dtk,
     pra-pasang nyaris instan (0,12 dtk) supaya pola cepatnya tetap
     bebas hambatan. */
  const [underlay, setUnderlay] = useState(false)

  useEffect(() => {
    const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const t = window.setTimeout(() => setUnderlay(true), rm ? 120 : 1800)
    return () => window.clearTimeout(t)
  }, [])

  /* Callback stabil untuk Splash — tanpa ini identitas arrow berubah tiap
     re-render (rehidrasi persist / update store terjadi tepat saat splash
     berjalan), memicu ulang effect di Splash: timeline anime.js kembali ke
     nol dan timer 2,6 dtk di-reset (splash terlihat "tersendat"). */
  const handleSplashDone = useCallback(() => setPhase('app'), [])

  /* Mesin sinkronisasi cloud (Turso): pulihkan state persist paska-mount
     (pola skipHydration — render pertama memakai seed, lalu histori lokal
     mengambil alih tanpa hydration mismatch), tarik/unggah snapshot
     server, lalu kirim setiap perubahan domain secara ter-debounce.
     materializeRecurring dijalankan engine setelah sinkronisasi awal. */
  useSyncEngine()

  /* v2.72 (audit PWA P0): entri riwayat untuk layar non-tab (Profil/
     Jurnal/Statistik) — Back pengguna memulihkan layar asal, bukan
     keluar aplikasi. Dipasang di cangkang, sekali. */
  useScreenBackHistory()

  /* v2.45 (audit J1 — P0): rehidrasi mood catatan DI SHELL — selama ini
     hanya layar Jurnal yang memanggilnya; membuka catatan lewat Hub atau
     chip "Lanjutkan draft" Beranda SEBELUM mengunjungi Jurnal berarti
     noteMoods masih kosong → kanvas menyimpan mood null dan MENGHAPUS
     mood yang tercatat. Juga sesi gym aktif (persist v2.45) dipulihkan
     di sini — selamat dari refresh. */
  useEffect(() => {
    /* rehydrate() mengembalikan void | Promise<void> (tipe zustand) —
       dibungkus Promise.resolve agar migrasi tunggu sampai selesai. */
    void Promise.resolve(useJournalUi.persist.rehydrate()).then(() => {
      /* Migrasi sekali-jalan (revisi audit J3): preferensi mode Aktivitas
         Menulis dulunya key localStorage mandiri; kini hidup di persist
         journal-ui. Nilai lama dipindahkan bila ada, lalu key dibersihkan
         agar tidak menjadi sampah abadi. */
      try {
        const legacy = localStorage.getItem('rutina-2.0-journal-activity-view')
        if (legacy != null) {
          if (legacy === 'kata' || legacy === 'kalender') {
            useJournalUi.setState({ activityView: legacy })
          }
          localStorage.removeItem('rutina-2.0-journal-activity-view')
        }
      } catch {
        /* localStorage tidak tersedia — preferensi lama diabaikan. */
      }
    })
    void useSessionStore.persist.rehydrate()
  }, [])

  /* PWA — daftarkan service worker offline shell HANYA di production.
     Di dev, strategi stale-while-revalidate SW untuk chunk /_next/static
     menyajikan chunk basi setelah suntingan (kode baru baru muncul pada
     reload kedua) — membingungkan iterasi. Kegagalan didiamkan: SW adalah
     pening pengalaman, bukan kebutuhan fungsional.
     v2.73 (audit PWA P1): pembaruan kini DIUMUMKAN — updatefound → SW
     baru terpasang → satu toast pasif "Versi baru tersedia" dengan tombol
     "Muat ulang" yang dipegang pengguna. TIDAK PERNAH reload paksa:
     pengguna yang sedang mengisi formulir / memiliki draf tidak boleh
     kehilangan sesi karena pembaruan (audit lifecycle PWA). PWA standalone
     berumur panjang juga memeriksa versi baru saat kembali dari
     background (visibilitychange) — browser hanya memeriksa otomatis
     pada navigasi, yang tidak pernah terjadi di SPA. */
  useEffect(() => {
    if (
      process.env.NODE_ENV !== 'production' ||
      !('serviceWorker' in navigator) ||
      (location.protocol !== 'https:' && location.hostname !== 'localhost')
    ) {
      return
    }
    let updateAnnounced = false
    let swCleanup: (() => void) | undefined
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        const announce = () => {
          if (updateAnnounced) return
          updateAnnounced = true
          toast.info('Versi baru Rutina tersedia', {
            description:
              'Pembaruan sudah terpasang di latar — muat ulang kapan pun kamu siap.',
            action: {
              label: 'Muat ulang',
              onClick: () => window.location.reload(),
            },
            duration: 12000,
          })
        }
        reg.addEventListener('updatefound', () => {
          const sw = reg.installing
          if (!sw) return
          sw.addEventListener('statechange', () => {
            /* Terpasang + sudah ada versi lama yang mengendalikan
               halaman → inilah pembaruan; halaman berjalan tetap
               memakai kode lama sampai pengguna memilih muat ulang. */
            if (sw.state === 'installed' && navigator.serviceWorker.controller) {
              announce()
            }
          })
        })
        /* Sesi standalone panjang: periksa pembaruan saat kembali dari
           background. Browser membatasi pemeriksaan (maks ±1×/24 jam)
           — panggilan tambahan murah dan di-throttle sendiri. */
        const onUpdateCheck = () => {
          if (document.visibilityState === 'visible') void reg.update()
        }
        document.addEventListener('visibilitychange', onUpdateCheck)
        swCleanup = () =>
          document.removeEventListener('visibilitychange', onUpdateCheck)
      })
      .catch(() => {
        /* SW gagal didaftarkan — pening pengalaman, bukan fungsional. */
      })
    return swCleanup
  }, [])

  /* Prefetch idle (v2.40 re-sequenced) — dulu dijadwalkan 1,5 dtk,
     tepat sebelum splash exit: parse/kompilasi enam chunk bertabrakan
     dengan transisi pembuka. Kini pemanasan baru berjalan SETELAH
     reveal tenang, saat browser benar-benar idle (requestIdleCallback,
     timeout 2,5 dtk) — navigasi pertama tetap instan tanpa pernah
     mencuri frame dari momen pembuka. */
  useEffect(() => {
    if (phase !== 'app') return
    const warm = () => {
      void loadBugar()
      void loadJournal()
      void loadKebiasaan()
      void loadKeuangan()
      void loadStats()
      void loadProfile()
    }
    /* Alias opsional — `in`/typeof pada `window` langsung membuat TS
       menyempitkan tipe ke never di cabang lain (lib DOM selalu
       mendeklarasikan requestIdleCallback), jadi cek lewat alias. */
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number
      cancelIdleCallback?: (id: number) => void
    }
    if (typeof w.requestIdleCallback === 'function') {
      const id = w.requestIdleCallback(warm, { timeout: 2500 })
      return () => w.cancelIdleCallback?.(id)
    }
    const t = window.setTimeout(warm, 1200)
    return () => window.clearTimeout(t)
  }, [phase])

  /* Arah transisi (derivasi murni dari state): maju (1) bila pindah ke
     kanan, mundur (-1) bila ke kiri. */
  const dir =
    ORDER.indexOf(screen) >= ORDER.indexOf(prevScreen) ? 1 : -1

  /* "Ruang Warna" — kanvas & cahaya ambien tiap layar mengikuti identitas
     domainnya (SCREEN_THEME): Bugar eucalyptus, Keuangan bronze, Kebiasaan
     rose clay, Statistik slate, dst. Kanvas crossfade saat pindah tab;
     mode gelap memakai varian espresso bertint domain. */
  const { resolvedTheme } = useTheme()
  const dark = resolvedTheme === 'dark'
  const theme = SCREEN_THEME[screen]
  const canvas = dark ? theme.bgDark : theme.bg
  const glow = dark ? theme.glowDark : theme.glow

  /* Momen naik level — konfeti + toast, dipusatkan di shell agar berlaku
     untuk semua layar (misi bisa dicentang dari Beranda maupun Statistik).
     XP dihitung dari penyelesaian HARI INI yang nyata.
     v2.42: penanda perayaan DIPERSIST per tanggal (uiPrefs.celebratedOn)
     — dulu sekadar useRef yang reset tiap reload, sehingga pengguna yang
     sudah Level 8 mendapat konfeti replay setiap buka aplikasi. */
  const leveledRef = useRef(false)
  const celebratedOn = useRutina((s) => s.uiPrefs.celebratedOn)
  const setUiPref = useRutina((s) => s.setUiPref)
  const today = todayISO()
  const xp = computeXp(doneCountOn(completions, today), bonusClaimed)
  const level = computeLevel(xp)
  useEffect(() => {
    if (level >= 8 && !leveledRef.current && celebratedOn !== today) {
      leveledRef.current = true
      setUiPref({ celebratedOn: today })
      useRutina.getState().setCelebrating(true)
      toast.success('Naik ke Level 8 — petualang sejati!')
    }
  }, [level, celebratedOn, today, setUiPref])

  /* `revealed` — gerbang koreografi ikon cangkang: nav & FAB menunggu
     momen splash benar-benar pergi sebelum menari (lihat bottom-nav &
     quick-action-hub). v2.87: sinyal yang sama dibagikan ke WordReveal
     judul Beranda (shell-reveal) — reveal per-kata menunggu splash,
     bukan bermain tersembunyi di baliknya. */
  const revealed = phase === 'app'

  useEffect(() => {
    if (revealed) markShellRevealed()
  }, [revealed])

  return (
    /* MotionConfig reducedMotion="user" kini disediakan AppMotionProvider
       (LazyMotion domMax) di app-frame — tidak perlu duplikat di sini. */
    <div className="@container relative flex h-full w-full flex-col overflow-hidden text-content-primary">
        <AnimatePresence>
          {phase === 'splash' && (
            <Splash key="splash" onDone={handleSplashDone} />
          )}
        </AnimatePresence>

        {(underlay || revealed) && (
          /* Pembungkus pra-pasang: selama masih di balik splash, seluruh
             pohon aplikasi inert (tak bisa difokus, tak terbaca layar
             pembaca, tak bisa diketuk) — splash tetap satu-satunya hal
             interaktif. Tanpa transform (position:fixed sheet di dalamnya
             tetap relatif viewport). `display` biasa — flex kolom meniru
             anatomi lama agar nav/flex-1 tidak bergeser. */
          <div
            className="absolute inset-0 flex flex-col"
            inert={!revealed}
          >
            {/* Kanvas utama — warnanya ber-crossfade mengikuti tab aktif */}
            <m.div
              aria-hidden="true"
              className="absolute inset-0"
              initial={false}
              animate={{ backgroundColor: canvas }}
              transition={canvasFade}
            />

            {/* Cahaya ambien — tiga blob lembut bernuansa warna domain layar */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
              <m.div
                className="absolute -left-24 -top-24 h-72 w-72 rounded-full blur-3xl"
                initial={false}
                animate={{ backgroundColor: glow[0] }}
                transition={{ duration: motionTokens.duration.ambient }}
              />
              <m.div
                className="absolute -bottom-28 -right-20 h-80 w-80 rounded-full blur-3xl"
                initial={false}
                animate={{ backgroundColor: glow[1] }}
                transition={{ duration: motionTokens.duration.ambient, delay: motionTokens.delay.tight }}
              />
              <m.div
                className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full blur-3xl"
                initial={false}
                animate={{ backgroundColor: glow[2] }}
                transition={{ duration: motionTokens.duration.ambient, delay: motionTokens.delay.normal }}
              />
            </div>

            {/* Area konten — kolom terpusat, layar penuh di perangkat kecil.
                v2.40: mode="wait" diganti SYNC — dulu exit (0,24 dtk)
                menunggu SELESAI dulu baru enter (0,24 dtk) = 0,48 dtk
                yang terasa lambat untuk aktivitas SERING; kini keduanya
                berjalan bersamaan (crossfade berarah, keduanya absolut
                inset-0 sehingga tumpang-tindihnya bersih) — pindah tab
                terasa dua kali lebih responsif. */}
            <div className="relative min-h-0 flex-1">
              <AnimatePresence initial={false} custom={dir}>
                <m.div
                  key={screen}
                  custom={dir}
                  variants={slide}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={motionTokens.preset.screenSwap}
                  className={`absolute inset-0 mx-auto w-full ${CONTENT_W}`}
                >
                  {screen === 'beranda' && <HomeScreen />}
                  {screen === 'bugar' && <BugarScreen />}
                  {screen === 'jurnal' && <JournalScreen />}
                  {screen === 'keuangan' && <KeuanganScreen />}
                  {screen === 'kebiasaan' && <KebiasaanScreen />}
                  {screen === 'statistik' && <StatsScreen />}
                  {screen === 'profil' && <ProfileScreen />}
                </m.div>
              </AnimatePresence>
            </div>

            {/* v2.74 (audit PWA P1): strip status sinkronisasi mobile —
                muncul hanya saat offline / gagal / ditolak, di atas
                navigasi bawah; senyap saat sehat. */}
            <SyncStatusStrip />

            {/* Navigasi bawah disembunyikan di layar Profil (bukan tab) —
                orientasi dijaga tombol "Kembali" pada layar Profil.
                Di desktop (lg+) tab bawah disembunyikan total oleh
                bottom-nav (lg:hidden); navigasi berpindah ke bilah sisi
                yang dirender app-frame di luar komponen ini. */}
            {screen !== 'profil' && <BottomNav revealed={revealed} />}
            {/* Pusat aksi cepat global — FAB mengambang (disembunyikan di
                Profil, konsisten dengan navigasi bawah) + hub + check-in. */}
            <QuickActionFab revealed={revealed} />
            <ComposeSheet />
            <ReadingSheet />
            <AddTxSheet />
            <TransferSheet />
            <ContributeGoalSheet />
            <NewGoalDialog />
            <EditGoalDialog />
            <HabitSheet />
            <WorkoutSheet />
            <FoodSheet />
            <CheckInSheet />
            <QuickActionHub />
            <DesignBoard open={boardOpen} onClose={closeBoard} />
            <CelebrationOverlay active={celebrating} />
          </div>
        )}
      </div>
  )
}
