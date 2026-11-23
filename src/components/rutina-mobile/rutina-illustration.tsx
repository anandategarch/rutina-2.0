'use client'

import Image from 'next/image'

import { cn } from '@/lib/utils'

/**
 * RutinaIllustration — bingkai seragam untuk aset visual Rutina
 * (ilustrasi dengan latar parchment baked-in dari paket 30 aset).
 *
 * Latar gambar tidak transparan, jadi selalu dirender sebagai "inset terang"
 * (rounded + ring) agar tetap harmonis pada mode terang maupun gelap.
 * Lihat public/images/rutina-assets/ASSET-USAGE.md untuk status pemakaian.
 */

const ASSET_BASE = '/images/rutina-assets/webp'

/** URL aset berdasarkan nama file tanpa ekstensi. */
export function assetUrl(name: string): string {
  return `${ASSET_BASE}/${name}.webp`
}

export interface RutinaIllustrationProps {
  /** Nama file aset tanpa ekstensi, mis. "12-finance-coin-stacks". */
  name: string
  /** Teks alternatif; default kosong (dekoratif). */
  alt?: string
  className?: string
  /** Basis ukuran render (px) untuk optimasi gambar. Default 240. */
  size?: number
  priority?: boolean
}

export function RutinaIllustration({
  name,
  alt = '',
  className,
  size = 240,
  priority,
}: RutinaIllustrationProps) {
  return (
    <Image
      src={assetUrl(name)}
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      className={cn(
        'rounded-xl object-cover ring-1 ring-border-default/50',
        className,
      )}
    />
  )
}
