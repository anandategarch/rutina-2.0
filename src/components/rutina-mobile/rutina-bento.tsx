'use client'

import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

/**
 * RutinaBentoGrid — kisi 12 kolom standar komposisi desktop Rutina.
 *
 * Earth-Tone Editorial Bento: hierarki dibangun lewat PERBEDAAN UKURAN tile
 * (hero/feature/wide/medium/stat/compact/full), bukan lewat warna — kartu
 * biasa tetap parchment dengan hairline. Proporsi komposisi (bukan standar
 * teknis mutlak): ~70% permukaan netral, 20% matcha, 10% aksen modul/status.
 *
 * Perilaku responsif:
 * - ponsel  : satu kolom penuh (metrik setara boleh 2 kolong lewat span stat).
 * - sm–xl   : kisi 6 kolom — tile setengah/sepertiga lebar.
 * - xl+     : kisi 12 kolom — komposisi editorial penuh.
 */
export function RutinaBentoGrid({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-4 sm:grid-cols-6 xl:grid-cols-12',
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
  | 'stat' // 3 kolom — metrik kecil (2 kolom di sm)
  | 'compact' // 4 kolom — status / shortcut / ringkasan
  | 'full' // 12 kolom — tabel / agenda / konten utama

const SPAN_CLASS: Record<RutinaBentoSpan, string> = {
  hero: 'sm:col-span-6 xl:col-span-8',
  feature: 'sm:col-span-6 xl:col-span-4',
  wide: 'sm:col-span-6 xl:col-span-8',
  medium: 'sm:col-span-3 xl:col-span-6',
  stat: 'sm:col-span-3',
  compact: 'sm:col-span-3 xl:col-span-4',
  full: 'sm:col-span-6 xl:col-span-12',
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
