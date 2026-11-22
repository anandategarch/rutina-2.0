'use client'

import { useEffect, useRef } from 'react'

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

/** Penanda entri riwayat milik lapisan. */
interface OverlayStateMark {
  rutinaOverlay?: number
}

function readMark(state: unknown): number | null {
  if (state && typeof state === 'object' && 'rutinaOverlay' in state) {
    const v = (state as OverlayStateMark).rutinaOverlay
    if (typeof v === 'number') return v
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
  })
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
