'use client'

import { useEffect, useRef } from 'react'

import { useRutina, type Screen } from './store'

/* =====================================================================
 * Tumpukan lapisan Escape — v2.49 (audit).
 *
 * Akar masalah: setiap sheet/dialog memasang window keydown-nya
 * sendiri. Saat sheet bersarang terbuka (pemilih kategori di atas lembar
 * transaksi, pemilih gerakan di atas Catat Aktivitas, AlertDialog di
 * atas lembar baca), SATU ketukan Escape menjalankan SEMUA handler
 * aktif sekaligus — draf panjang pengguna lenyap bersama sheet induknya.
 *
 * Solusi: satu dispatcher global + tumpukan lapisan. Hanya lapisan
 * TERATAS (terakhir dipasang) yang merespons; setelah menutup, ketukan
 * Escape berikutnya jatuh ke lapisan di bawahnya. Dialog radix
 * (role="alertdialog") diutamakan — dispatcher mundur dan membiarkan
 * radix menanganinya (pola lama reading-sheet, kini terpusat).
 *
 * =====================================================================
 * v2.71 (audit PWA P0): tombol Back Android / Back browser.
 *
 * Akar masalah: aplikasi SPA satu-halaman tanpa satu pun integrasi
 * History API. Di PWA standalone (Android) menekan Back saat sheet/
 * dialog terbuka keluar aplikasi — padahal harapan pengguna (dan
 * konvensi platform): menutup lapisan teratas saja. Draf formulir
 * panjang ikut lenyap.
 *
 * Solusi — SATU entri riwayat per lapisan, ditambah invariant repair:
 *  - Lapisan terbuka          → history.pushState({rutinaOverlay: id}).
 *  - Back pengguna (popstate) → tutup lapisan dari atas sampai lapisan
 *    teratas cocok dengan penanda entri yang dihuni (e.state.rutinaOverlay)
 *    — LIFO alami; entri tiap lapisan ikut terpop.
 *  - Ditutup via UI (Escape/seret/submit) → bila masih duduk di atas
 *    entrinya sendiri, SATU history.back() (ditandai internalBack agar
 *    popstate-nya tidak dihitung sebagai Back pengguna).
 *  - INVARIANT REPAIR di akhir tiap popstate: bila masih ada lapisan
 *    hidup, entri teratas riwayat HARUS milik lapisan teratas — jika
 *    tidak, dorong ulang. Ini menambal balapan transisi satu-tick
 *    (hub→sheet): back() dari lapisan lama menargetkan indeks secara
 *    sinkron, lalu pushState lapisan baru terjadi SEBELUM traversa
 *    dieksekusi, sehingga entrinya ikut terpop — repair mengembalikan
 *    entri lapisan baru itu. Tanpa timer, tanpa tebakan durasi.
 *  - Entri berpenanda lapisan yang sudah mati (hantu) dirantai-buang
 *    otomatis pada popstate berikutnya.
 * ===================================================================== */

interface EscapeLayer {
  onClose: () => void
  /** ID entri riwayat milik lapisan ini (v2.71). */
  overlayId: number
}

const layers: EscapeLayer[] = []
let globalInstalled = false
let nextOverlayId = 1
/* Back yang kita picu sendiri untuk membuang entri — popstate-nya
   BUKAN Back pengguna; jangan tutup lapisan apa pun. */
let internalBack = false

interface OverlayStateMark {
  rutinaOverlay?: number
  /** v2.72: layar non-tab (Profil/Jurnal/Statistik) — entri riwayat
      layar tersendiri agar Back kembali ke layar asal. */
  rutinaScreen?: Screen
}

function readMark(state: unknown): number | null {
  if (state && typeof state === 'object' && 'rutinaOverlay' in state) {
    const v = (state as OverlayStateMark).rutinaOverlay
    if (typeof v === 'number') return v
  }
  return null
}

function readScreenMark(state: unknown): Screen | null {
  if (state && typeof state === 'object' && 'rutinaScreen' in state) {
    const v = (state as OverlayStateMark).rutinaScreen
    if (typeof v === 'string') return v as Screen
  }
  return null
}

/** Tutup lapisan dari atas sampai lapisan teratas ber-id `targetId`
 *  (atau semua bila targetId null). onClose tiap lapisan idempoten. */
function unwindLayers(targetId: number | null): void {
  while (layers.length > 0) {
    const top = layers[layers.length - 1]!
    if (targetId != null && top.overlayId === targetId) break
    top.onClose()
    /* onClose → setState React; lapisan dilepas dari tumpukan saat
       cleanup effect — jaminan kemajuan: kalau cleanup belum sempat
       berjalan di loop yang sama, potong manual agar tak menggantung. */
    if (layers[layers.length - 1] === top) layers.pop()
  }
}

/** Bawa riwayat kembali konsisten dengan tumpukan lapisan yang hidup:
 *  entri teratas harus milik lapisan teratas. */
function repairHistory(): void {
  if (layers.length === 0) return
  try {
    const top = layers[layers.length - 1]!
    if (readMark(window.history.state) !== top.overlayId) {
      window.history.pushState({ rutinaOverlay: top.overlayId }, '')
    }
  } catch {
    /* history tak tersedia — tanpa repair, overlay tetap berfungsi. */
  }
}

function installGlobal(): void {
  if (globalInstalled || typeof window === 'undefined') return
  globalInstalled = true
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return
    /* Dialog konfirmasi radix (AlertDialog) menangani Escape-nya
       sendiri — jangan berebut dengannya. */
    if (document.querySelector('[role="alertdialog"]')) return
    const top = layers[layers.length - 1]
    if (top) top.onClose()
  })
  /* v2.71: Back pengguna — tumpukan lapisan mengalahkan navigasi:
     menutup lapisan adalah perilaku Back yang benar, bukan keluar
     aplikasi. */
  window.addEventListener('popstate', (e) => {
    const wasInternal = internalBack
    internalBack = false
    if (!wasInternal) {
      /* Back pengguna: entri teratas terpop; state entri tujuan
         memberi tahu lapisan mana yang seharusnya tetap hidup. */
      const target = readMark(e.state)
      unwindLayers(target)
      /* v2.72: layar — hanya bila tak ada lapisan overlay hidup
         (entri layar berada DI BAWAH entri overlay). */
      if (layers.length === 0) {
        const screenTarget = readScreenMark(e.state)
        if (screenTarget != null) {
          /* Mendarat pada entri layar non-tab → pulihkan layar itu. */
          screenEntryLive = true
          restoreScreen(screenTarget)
        } else if (screenEntryLive) {
          /* Entri layar terpop oleh Back pengguna → kembali ke tab
             utama tempat alur bermula. */
          screenEntryLive = false
          if (isSubtreeScreen(useRutina.getState().screen)) {
            restoreScreen(lastBaseScreen)
          }
        }
      }
    }
    /* Entri hantu: mendarat pada entri milik lapisan yang sudah mati
       (transisi satu-tick) — buang berantai sampai entri bersih. */
    const mark = readMark(window.history.state)
    if (layers.length === 0 && mark != null) {
      try {
        internalBack = true
        window.history.back()
      } catch {
        /* tanpa history — biarkan */
      }
      return
    }
    /* Balapan traversa: lapisan baru dibuka di tengah back() lapisan
       lama → entrinya ikut terpop. Pulihkan. */
    repairHistory()
    /* v2.72: balapan yang sama bisa mempop entri layar — pulihkan
       bila layar non-tab aktif tanpa entrinya. */
    if (
      wasInternal &&
      layers.length === 0 &&
      screenEntryLive &&
      readScreenMark(window.history.state) == null &&
      isSubtreeScreen(useRutina.getState().screen)
    ) {
      try {
        window.history.pushState(
          { rutinaScreen: useRutina.getState().screen },
          '',
        )
      } catch {
        /* tanpa history — biarkan */
      }
    }
  })
}

/* =====================================================================
 * v2.72 (audit PWA P0): Back dari layar non-tab.
 * Profil, Jurnal, dan Statistik dibuka dari kartu/hub/avatar — bukan
 * tab bawah. Tanpa entri riwayat, Back dari layar tersebut KELUAR
 * aplikasi, padahal konvensi mobile: kembali ke layar asal.
 *
 * Model: SATU entri {rutinaScreen} di atas entri dasar, dibuat saat
 * berpindah tab-utama → layar non-tab; dibuang saat kembali ke tab
 * utama (bottom nav); dipulihkan oleh Back pengguna. Perpindahan
 * antar layar non-tab memperbarui penanda di tempat (replaceState).
 * ===================================================================== */

/** Layar yang dijangkau lewat kartu/hub — bukan tab bawah. */
const SUBTREE_SCREENS: ReadonlySet<Screen> = new Set([
  'jurnal',
  'profil',
  'statistik',
])

function isSubtreeScreen(s: Screen): boolean {
  return SUBTREE_SCREENS.has(s)
}

/* Apakah entri layar {rutinaScreen} sedang hidup di atas entri dasar? */
let screenEntryLive = false
/* Tab utama terakhir — tujuan pemulihan saat Back keluar dari layar
   non-tab (dicatat pada tiap kunjungan layar utama). */
let lastBaseScreen: Screen = 'beranda'
/* Pemulihann popstate memanggil setScreen — jangan catat/push ulang. */
let restoringScreen = false

function restoreScreen(s: Screen): void {
  if (useRutina.getState().screen === s) return
  restoringScreen = true
  try {
    useRutina.getState().setScreen(s)
  } finally {
    restoringScreen = false
  }
}

/** Pasang sekali di cangkang aplikasi (RutinaApp): kelola entri riwayat
 *  layar non-tab; Back pengguna memulihkan layar asal. */
export function useScreenBackHistory(): void {
  useEffect(() => {
    installGlobal()
    const unsub = useRutina.subscribe((s, prev) => {
      if (s.screen === prev.screen) return
      if (restoringScreen) return
      if (!isSubtreeScreen(s.screen)) {
        /* Kunjungan tab utama — catat tujuan pemulihan Back. */
        lastBaseScreen = s.screen
        /* Keluar dari layar non-tab via tab bawah → konsumsi entrinya
           agar Back berikutnya tidak memantul kembali. */
        if (isSubtreeScreen(prev.screen) && screenEntryLive) {
          screenEntryLive = false
          try {
            if (readScreenMark(window.history.state) != null) {
              internalBack = true
              window.history.back()
            }
          } catch {
            /* tanpa history — biarkan */
          }
        }
        return
      }
      /* Menuju layar non-tab. */
      if (isSubtreeScreen(prev.screen)) {
        /* non-tab → non-tab: perbarui penanda entri di tempat. */
        try {
          if (readScreenMark(window.history.state) != null) {
            window.history.replaceState(
              { rutinaScreen: s.screen },
              '',
            )
            screenEntryLive = true
          }
        } catch {
          /* tanpa history — biarkan */
        }
      } else {
        /* tab utama → non-tab: dorong entri layar. */
        try {
          window.history.pushState({ rutinaScreen: s.screen }, '')
          screenEntryLive = true
        } catch {
          /* tanpa history — Back tetap keluar; tak fatal. */
        }
      }
    })
    return unsub
  }, [])
}

/** Pasang satu lapisan Escape selama `open` bernilai true. Handler
 *  `onClose` boleh berubah-identitas tiap render (dibaca lewat ref —
 *  urutan tumpukan tidak pernah tergeser oleh re-render induk).
 *
 *  v2.71: sekaligus menambah entri riwayat agar Back menutup lapisan,
 *  bukan aplikasi. */
export function useEscapeLayer(open: boolean, onClose: () => void): void {
  const ref = useRef(onClose)
  useEffect(() => {
    ref.current = onClose
  }, [onClose])
  useEffect(() => {
    if (!open) return
    installGlobal()
    const overlayId = nextOverlayId++
    const layer: EscapeLayer = {
      overlayId,
      onClose: () => ref.current(),
    }
    layers.push(layer)
    /* Entri riwayat bertanda id — konsumsi entri saat lapisan ditutup
       lewat UI (lihat cleanup). Gagal (mode privasi dsb.) tak fatal:
       lapisan tetap tertutup oleh Escape/backdrop. */
    try {
      window.history.pushState({ rutinaOverlay: overlayId }, '')
    } catch {
      /* history penuh/diblokir — overlay tetap berfungsi tanpa Back. */
    }
    return () => {
      const i = layers.indexOf(layer)
      if (i >= 0) layers.splice(i, 1)
      /* Masih duduk di atas entri sendiri → buang dengan satu back()
         (internalBack). Bila entri sudah terpop (Back pengguna) atau
         tertimpa entri lapisan baru (transisi satu-tick — traversa
         back() kita masih berjalan), repairHistory di popstate yang
         menuntaskan sisanya. Sinkron, tanpa timer. */
      try {
        if (readMark(window.history.state) === overlayId) {
          internalBack = true
          window.history.back()
        }
      } catch {
        /* tanpa history — tidak ada yang perlu dibersihkan */
      }
    }
  }, [open])
}
