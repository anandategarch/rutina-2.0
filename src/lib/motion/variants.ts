import type { Variants } from 'motion/react'

import { motionTokens } from './tokens'
import { staggerChildren } from './transitions'

const { easing } = motionTokens

/**
 * Variants bersama — koreografi masuk yang dipakai lintas layar
 * supaya ritme aplikasi terasa satu bahasa.
 */

/** Baris pengaturan — masuk geser dari kiri + fade. */
export const slideInRow: Variants = {
  hidden: { opacity: 0, x: -18 },
  show: {
    opacity: 1,
    x: 0,
    /* v2.37: literal 0.56 → token pageEntrance (0.55) — kebocoran
       governance terakhir di lapisan variants. */
    transition: {
      duration: motionTokens.preset.pageEntrance.duration,
      ease: easing.entrance,
    },
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
    transition: { duration: motionTokens.preset.data.duration, ease: easing.entrance },
  },
}
