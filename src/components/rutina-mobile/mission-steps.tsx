'use client'

import * as m from 'motion/react-m'

import { useAnimePop } from './anime-kit'
import { useFirstVisit } from '@/lib/motion/first-visit'
import { motionTokens } from '@/lib/motion/tokens'

/* Batas petak fisik — di atasnya tiap petak mewakili >1 misi secara
   proporsional (angka persis tetap dibawa teks di kartu hero). */
const MAX_SEGMENTS = 14

/**
 * MissionSteps — "petak kebun" progres hero Beranda (v2.39).
 *
 * Menggantikan cincin progres lama yang menampak seperti roda gigi:
 * kini tiap misi terjadwal hari ini diwakili satu petak memanjang;
 * petak terisi tumbuh matcha dari kiri lewat spring reaktif — setiap
 * centang kebiasaan (nilai turunan langsung dari state completions di
 * pemanggil) menumbuhkan petak berikutnya tanpa state lokal basi,
 * dan batal centang memipihkannya kembali.
 *
 * Bentuk linear (bukan melingkar) membaca seperti tangga misi: tersisa
 * berapa petak = tersisa berapa langkah. >14 misi dilipat ke 14 petak
 * proporsional. Mencapai penuh tetap memicu ledakan elastis anime.js.
 *
 * Dekoratif semata (aria-hidden) — angka persis dibawa teks "X dari Y
 * misi" + persen di kartu hero, petak tidak mengumumkan dobel.
 */
export function MissionSteps({
  done,
  total,
  entrance,
  className,
}: {
  done: number
  total: number
  /** false = tampil instan tanpa menggambar petak (kunjungan ulang).
   *  Default: gerbang firstVisit internal. */
  entrance?: boolean
  className?: string
}) {
  const selfEntrance = useFirstVisit('home-steps')
  const playEntrance = entrance ?? selfEntrance
  const complete = total > 0 && done >= total

  const segCount = Math.min(Math.max(total, 0), MAX_SEGMENTS)
  /* total ≤ 14 → satu petak per misi (presisi penuh); di atasnya
     proporsional — pembulatan bisa menyimpang ±1 petak, angka teks
     tetap persis. */
  const filledCount =
    segCount <= 0
      ? 0
      : total <= MAX_SEGMENTS
        ? Math.min(done, segCount)
        : Math.min(Math.round((done / total) * segCount), segCount)

  /* Pop perayaan saat petak BARU saja penuh (bukan saat tetap penuh). */
  const stripRef = useAnimePop<HTMLDivElement>(null, complete, {
    scale: 1.03,
    duration: motionTokens.preset.chartRevealMs.duration,
    back: 2.4,
  })

  if (segCount <= 0) return null

  return (
    <div
      ref={stripRef}
      aria-hidden="true"
      className={'flex h-2.5 items-stretch gap-1 ' + (className ?? '')}
    >
      {Array.from({ length: segCount }, (_, i) => (
        <span
          key={i}
          className="min-w-1 flex-1 overflow-hidden rounded-full bg-primary/15"
        >
          <m.span
            className="block h-full origin-left rounded-full bg-primary"
            initial={playEntrance ? { scaleX: 0 } : false}
            animate={{ scaleX: i < filledCount ? 1 : 0 }}
            transition={motionTokens.spring.smooth}
          />
        </span>
      ))}
    </div>
  )
}
