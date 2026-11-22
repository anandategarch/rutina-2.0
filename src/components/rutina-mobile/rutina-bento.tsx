'use client'

import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

/**
 * RutinaBentoGrid — kisi bento yang sadar-kontainer (container-aware).
 *
 * Earth-Tone Editorial Bento: hierarki dibangun lewat PERBEDAAN UKURAN tile
 * (hero/feature/wide/medium/stat/compact/full), bukan lewat warna — kartu
 * biasa tetap parchment dengan hairline. Proporsi komposisi (bukan standar
 * teknis mutlak): ~70% permukaan netral, 20% matcha, 10% aksen modul/status.
 *
 * Mengapa container query, bukan breakpoint viewport? Desktop Rutina
 * menyandingkan sidebar 240px dan ContextRail 288px dengan kolom kerja —
 * pada jendela 1280px konten hanya ±750px. Keputusan "kisi 12 kolom"
 * harus diambil dari LEBAR RUANG KERJA NYATA (@container pada rutina-app),
 * bukan dari lebar jendela. Ambang (selaras skala kontainer Tailwind):
 *
 * - < 42rem  : micro-bento 2 kolom — tile `stat` berpasangan, sisanya
 *              memanjang penuh (metrik setara boleh berdampingan, daftar
 *              dan editor tetap satu kolom lega).
 * - ≥ 42rem  : kisi 6 kolom — tile setengah/sepertiga lebar.
 * - ≥ 52rem  : kisi 12 kolom — komposisi editorial penuh.
 *
 * Jarak antar-tile memakai token --layout-grid-gap (data-layout):
 * padat-nyaman di ponsel (16px — v2.64, dulu 12px terasa dempet),
 * lega mengikuti karakter tiap ruang kerja di kontainer lebar.
 */
export function RutinaBentoGrid({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-[var(--layout-grid-gap)] @[42rem]:grid-cols-6 @[52rem]:grid-cols-12',
        className,
      )}
      {...props}
    />
  )
}

/** Varian lebar tile bento (proporsi kolom desktop 12). */
export type RutinaBentoSpan =
  | 'hero' // 8 kolom — konten paling penting
  | 'feature' // 4 kolom — widget spesial / insight
  | 'wide' // 8 kolom — grafik / daftar
  | 'medium' // 6 kolom — dua kartu penting berdampingan
  | 'stat' // 3 kolom — metrik kecil (SEPARUH lebar di ponsel!)
  | 'compact' // 4 kolom — status / shortcut / ringkasan
  | 'full' // 12 kolom — tabel / agenda / konten utama

const SPAN_CLASS: Record<RutinaBentoSpan, string> = {
  hero: 'col-span-2 @[42rem]:col-span-6 @[52rem]:col-span-8',
  feature: 'col-span-2 @[42rem]:col-span-6 @[52rem]:col-span-4',
  wide: 'col-span-2 @[42rem]:col-span-6 @[52rem]:col-span-8',
  medium: 'col-span-2 @[42rem]:col-span-3 @[52rem]:col-span-6',
  stat: 'col-span-1 @[42rem]:col-span-3 @[52rem]:col-span-3',
  compact: 'col-span-2 @[42rem]:col-span-3 @[52rem]:col-span-4',
  full: 'col-span-2 @[42rem]:col-span-6 @[52rem]:col-span-12',
}

export interface RutinaBentoItemProps
  extends HTMLAttributes<HTMLDivElement> {
  /** Proporsi tile dalam kisi 12 kolom (lihat RutinaBentoSpan). */
  span?: RutinaBentoSpan
}

export function RutinaBentoItem({
  span,
  className,
  ...props
}: RutinaBentoItemProps) {
  return (
    <div
      className={cn('min-w-0', span && SPAN_CLASS[span], className)}
      {...props}
    />
  )
}
