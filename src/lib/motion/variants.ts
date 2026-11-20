import type { Variants } from 'motion/react'

import { motionTokens } from './tokens'
import { staggerChildren } from './transitions'

const { duration, easing } = motionTokens

/**
 * Variants bersama — koreografi masuk yang dipakai lintas layar
 * supaya ritme aplikasi terasa satu bahasa.
 */

/** Elemen muncul naik dari bawah + fade. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.enter, ease: easing.standard },
  },
}

/** Baris pengaturan — masuk geser dari kiri + fade. */
export const slideInRow: Variants = {
  hidden: { opacity: 0, x: -18 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.56, ease: easing.entrance },
  },
}

/** Wadah stagger — anak-anak masuk bergiliran. */
export const staggerRows: Variants = {
  hidden: {},
  show: {
    transition: staggerChildren(motionTokens.stagger.relaxed, 0.05),
  },
}

/** Koreografi daftar jurnal — kartu naik beruntun. */
export const journalList: Variants = staggerRows
export const journalCard: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.data, ease: easing.entrance },
  },
}

/** Sheet bawah — panel naik dari dasar layar. */
export const sheetPanel: Variants = {
  hidden: { y: '100%' },
  show: { y: 0 },
  exit: { y: '100%' },
}

/** Backdrop gelap di belakang sheet. */
export const sheetBackdrop: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
  exit: { opacity: 0 },
}
