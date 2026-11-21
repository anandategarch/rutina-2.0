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
 * ===================================================================== */

interface EscapeLayer {
  onClose: () => void
}

const layers: EscapeLayer[] = []
let globalInstalled = false

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
}

/** Pasang satu lapisan Escape selama `open` bernilai true. Handler
 *  `onClose` boleh berubah-identitas tiap render (dibaca lewat ref —
 *  urutan tumpukan tidak pernah tergeser oleh re-render induk). */
export function useEscapeLayer(open: boolean, onClose: () => void): void {
  const ref = useRef(onClose)
  useEffect(() => {
    ref.current = onClose
  }, [onClose])
  useEffect(() => {
    if (!open) return
    installGlobal()
    const layer: EscapeLayer = { onClose: () => ref.current() }
    layers.push(layer)
    return () => {
      const i = layers.indexOf(layer)
      if (i >= 0) layers.splice(i, 1)
    }
  }, [open])
}
