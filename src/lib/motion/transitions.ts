import { motionTokens } from './tokens'
import type { Transition } from 'motion/react'

/**
 * Preset transisi tunggal — komponen memilih preset, bukan menulis
 * angka durasi/easing sendiri. Semua preset menghormati reduced-motion
 * otomatis lewat MotionConfig reducedMotion="user".
 */

const { duration, easing, spring } = motionTokens

/** Fade sederhana — overlay, backdrop. */
export const fade: Transition = { duration: duration.fast }

/** Masuk dari bawah — kartu, baris daftar. */
export const riseIn: Transition = {
  duration: duration.enter,
  ease: easing.standard,
}

/** Geser berarah antar tab layar. */
export const slideTab: Transition = {
  duration: duration.normal,
  ease: easing.standard,
}

/** Panel bottom sheet naik/turun. */
export const sheetSpring: Transition = spring.sheet

/** Umpan balik tekan tombol. */
export const pressSnappy: Transition = spring.snappy

/** Batang progres terisi (scaleX/width) — satu karakter gerak semua bar. */
export const barFill: Transition = spring.bar

/** Morph batang grafik saat periode berganti. */
export const chartBar: Transition = spring.chart

/** Perayaan (lencana, konfeti, hadiah). */
export const celebrate: Transition = spring.playful

/** Perubahan warna kanvas / crossfade latar. */
export const canvasFade: Transition = {
  duration: duration.enter + 0.13,
  ease: easing.standard,
}

/** Deret berantai dengan jeda antar anak. */
export function staggerChildren(
  each: number = motionTokens.stagger.normal,
  delayChildren: number = 0,
): Transition {
  return { staggerChildren: each, delayChildren }
}
